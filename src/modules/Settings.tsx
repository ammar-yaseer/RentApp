import { useState, Fragment } from 'react';
import { Settings as SettingsIcon, Save, Download, Upload, RotateCcw, Building2, Bell, Calendar, CreditCard, Globe, Users2, Plus, Edit2, Trash2, KeyRound, Power, ExternalLink, X, Eye, FilePlus, Pencil, Trash } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import type { User, UserRole, ModulePermissions, PermissionAction } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { isUserOnline, getCurrentUserId } from '../data/store';
import { eventsToICS, bookingToEvent, leasePaymentToEvent, maintenanceToEvent, insuranceToEvent, googleCalendarAuthUrl } from '../lib/googleCalendar';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { downloadFile, uid, nowISO, formatDateTime, compressImage, cn } from '../lib/utils';
import { useCurrentUser } from '../lib/hooks';
import { can, emptyPermissions, normalizePermissions, ALL_MODULE_KEYS } from '../lib/permissions';
import { NAV_ITEMS } from '../components/nav';

export default function Settings() {
  const { db, setSettings, exportData, importData, resetData, update } = useStore();
  const toast = useToast();
  const currentUser = useCurrentUser();
  const [form, setForm] = useState(db.settings);
  const [saved, setSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [userModal, setUserModal] = useState<User | null | 'new'>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [pwdModal, setPwdModal] = useState<User | null>(null);
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const canCreateUser = can(currentUser, 'settings', 'create');
  const canEditUser = can(currentUser, 'settings', 'edit');
  const canDeleteUser = can(currentUser, 'settings', 'delete');

  const save = () => {
    setSettings(form);
    setSaved(true);
    toast.success('Settings Saved', 'Business profile and preferences updated');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your RentFlow instance"
        actions={<Button icon={<Save size={16} />} onClick={save}>{saved ? 'Saved!' : 'Save Changes'}</Button>} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Business Profile" subtitle="Appears on invoices and receipts" />
          <div className="space-y-3">
            <Field label="Business Name" required><Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
            <Field label="Address"><Textarea value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Tax Registration Number"><Input value={form.taxRegNumber ?? ''} onChange={(e) => set('taxRegNumber', e.target.value)} /></Field>
            <Field label="System Logo">
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  <div className="relative">
                    <img src={form.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-slate-200 bg-white" />
                    <button type="button" onClick={() => set('logoUrl', undefined)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"><X size={12} /></button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <Building2 size={24} />
                  </div>
                )}
                <label className="btn-secondary cursor-pointer text-sm">
                  <Upload size={16} /> Upload Logo
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try { const dataUrl = await compressImage(file); set('logoUrl', dataUrl); toast.success('Logo Updated'); }
                      catch (err: any) { toast.error('Upload Failed', err?.message ?? 'Could not upload logo'); }
                    }
                  }} className="hidden" />
                </label>
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Localization & Tax" subtitle="Currency, language, tax rate" />
          <div className="space-y-3">
            <Field label="Default Currency"><Select value={form.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)}><option>LKR</option><option>USD</option><option>EUR</option><option>GBP</option></Select></Field>
            <Field label="Language"><Select value={form.language} onChange={(e) => set('language', e.target.value)}><option value="en">English</option><option value="si">Sinhala</option><option value="ta">Tamil</option></Select></Field>
            <Field label="Tax / VAT Rate (%)" hint="Applied to invoices as a distinct line"><Input type="number" step="0.01" value={form.taxRate} onChange={(e) => set('taxRate', +e.target.value)} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Document Numbering" subtitle="Prefixes and sequences for generated documents" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Invoice Prefix"><Input value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} /></Field>
            <Field label="Invoice Next #"><Input type="number" value={form.invoiceSeq} onChange={(e) => set('invoiceSeq', +e.target.value)} /></Field>
            <Field label="Receipt Prefix"><Input value={form.receiptPrefix} onChange={(e) => set('receiptPrefix', e.target.value)} /></Field>
            <Field label="Receipt Next #"><Input type="number" value={form.receiptSeq} onChange={(e) => set('receiptSeq', +e.target.value)} /></Field>
            <Field label="Booking Prefix"><Input value={form.bookingPrefix} onChange={(e) => set('bookingPrefix', e.target.value)} /></Field>
            <Field label="Booking Next #"><Input type="number" value={form.bookingSeq} onChange={(e) => set('bookingSeq', +e.target.value)} /></Field>
            <Field label="Payment Prefix"><Input value={form.paymentPrefix} onChange={(e) => set('paymentPrefix', e.target.value)} /></Field>
            <Field label="Payment Next #"><Input type="number" value={form.paymentSeq} onChange={(e) => set('paymentSeq', +e.target.value)} /></Field>
            <Field label="Expense Prefix"><Input value={form.expensePrefix} onChange={(e) => set('expensePrefix', e.target.value)} /></Field>
            <Field label="Expense Next #"><Input type="number" value={form.expenseSeq} onChange={(e) => set('expenseSeq', +e.target.value)} /></Field>
            <Field label="Settlement Prefix"><Input value={form.settlementPrefix} onChange={(e) => set('settlementPrefix', e.target.value)} /></Field>
            <Field label="Settlement Next #"><Input type="number" value={form.settlementSeq} onChange={(e) => set('settlementSeq', +e.target.value)} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Calendar Status Colors" subtitle="Customize calendar event colors" />
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(form.calendarColors).map(([status, color]) => (
              <Field key={status} label={status}>
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => set('calendarColors', { ...form.calendarColors, [status]: e.target.value })} className="w-10 h-10 rounded border border-slate-300 cursor-pointer" />
                  <Input value={color} onChange={(e) => set('calendarColors', { ...form.calendarColors, [status]: e.target.value })} />
                </div>
              </Field>
            ))}
          </div>
        </Card>

        {/* Google Calendar Integration */}
        <Card>
          <CardHeader title="Google Calendar" subtitle="Sync bookings, lease payments, maintenance, and insurance expiry to your Google Calendar" />
          <div className="space-y-3">
            <Field label="Google Account Email" hint="Enter the Google account email where events will be saved">
              <Input value={form.googleCalendarEmail ?? ''} onChange={(e) => set('googleCalendarEmail', e.target.value)} placeholder="your-email@gmail.com" />
            </Field>
            <Field label="Auto-Sync to Google Calendar">
              <Select value={form.googleCalendarSync ? 'true' : 'false'} onChange={(e) => set('googleCalendarSync', e.target.value === 'true')}>
                <option value="false">Disabled — manually add events</option>
                <option value="true">Enabled — show "Add to Google Calendar" buttons on all events</option>
              </Select>
            </Field>
            {form.googleCalendarEmail && (
              <div className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm">
                <p className="text-brand-700 font-medium mb-2">Connected Account: {form.googleCalendarEmail}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={googleCalendarAuthUrl(form.googleCalendarEmail)} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                    <ExternalLink size={14} /> Open Google Calendar
                  </a>
                  <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => {
                    const events = [
                      ...db.bookings.map((b) => bookingToEvent(b, `${b.number}`, 'Customer')),
                      ...db.leasePayments.filter((p) => p.status !== 'Paid').map((p) => leasePaymentToEvent(p, 'Lease')),
                      ...db.maintenances.map((m) => maintenanceToEvent(m, 'Vehicle')),
                      ...db.insurances.map((i) => insuranceToEvent(i, 'Vehicle')),
                    ];
                    downloadFile('rentflow-all-events.ics', eventsToICS(events), 'text/calendar');
                    toast.success('Calendar Exported', `${events.length} events exported as .ics file — import into Google Calendar`);
                  }}>Export All Events (.ics)</Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">To sync: 1) Click "Export All Events" 2) Open Google Calendar 3) Settings → Import & Export → Import the .ics file. Or use the "Add to Google Calendar" buttons on individual bookings.</p>
              </div>
            )}
            <p className="text-xs text-slate-400">When the backend is connected, this will use Google Calendar API with OAuth for automatic two-way sync. For now, events are exported as .ics files or added via Google Calendar URLs.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Data Management" subtitle="Export, import, or reset data" />
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Data is currently stored in your browser (localStorage). When the backend is ready, this will sync to Supabase automatically.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Download size={16} />} onClick={() => downloadFile(`rentflow-backup-${new Date().toISOString().slice(0, 10)}.json`, exportData())}>Export Backup</Button>
              <label className="btn-secondary cursor-pointer">
                <Upload size={16} /> Import Backup
                <input type="file" accept="application/json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => { if (importData(reader.result as string)) alert('Imported successfully'); else alert('Invalid file'); };
                  reader.readAsText(file);
                }} />
              </label>
              <Button variant="danger" icon={<RotateCcw size={16} />} onClick={() => setResetOpen(true)}>Reset to Seed Data</Button>
            </div>
          </div>
        </Card>

        {/* User Management */}
        <Card className="lg:col-span-2">
          <CardHeader title="User Accounts" subtitle="Create, edit, activate/deactivate system users" action={canCreateUser ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setUserModal('new')}>Add User</Button> : undefined} />
          {db.users.length === 0 ? (
            <EmptyState icon={<Users2 size={40} />} title="No users" subtitle="Add your first system user" action={canCreateUser ? <Button icon={<Plus size={16} />} onClick={() => setUserModal('new')}>Add User</Button> : undefined} />
          ) : (
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (u) => (
                  <span className="font-medium flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', isUserOnline(u.id) ? 'bg-green-500' : 'bg-slate-300')} title={isUserOnline(u.id) ? 'Online now' : 'Offline'} />
                    {u.name}
                    {getCurrentUserId() === u.id && <span className="text-[10px] text-brand-600 font-normal">(you)</span>}
                  </span>
                ) },
                { key: 'email', header: 'Email', render: (u) => u.email },
                { key: 'role', header: 'Role', render: (u) => <StatusBadge status={u.role} /> },
                { key: 'modules', header: 'Access', render: (u) => {
                  const granted = u.permissions ? ALL_MODULE_KEYS.filter((k) => u.permissions![k]?.view).length : null;
                  return (
                    <span className="text-xs text-slate-600">
                      {granted === null ? <span className="text-brand-600 font-medium">All (legacy)</span> : `${granted}/${ALL_MODULE_KEYS.length} modules`}
                    </span>
                  );
                } },
                { key: 'lastLogin', header: 'Last Login', render: (u) => u.lastLogin ? formatDateTime(u.lastLogin) : 'Never' },
                { key: 'status', header: 'Status', render: (u) => (
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    isUserOnline(u.id) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', isUserOnline(u.id) ? 'bg-green-500 animate-pulse' : 'bg-slate-400')} />
                    {isUserOnline(u.id) ? 'Online' : (u.active ? 'Active' : 'Inactive')}
                  </span>
                ) },
                { key: 'actions', header: '', align: 'right', render: (u) => (
                  <div className="flex gap-1 justify-end">
                    {canEditUser && <IconButton icon={<KeyRound size={14} />} label="Set Password" onClick={() => setPwdModal(u)} />}
                    {canEditUser && <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setUserModal(u)} />}
                    {canEditUser && (u.active ? (
                      <IconButton icon={<Power size={14} />} label="Deactivate" onClick={() => { update('users', (arr) => arr.map((x) => x.id === u.id ? { ...x, active: false } : x), { action: 'UPDATE', entity: 'User', entityId: u.id, after: 'active=false' }); toast.warning('User Deactivated', u.name); }} />
                    ) : (
                      <IconButton icon={<Power size={14} />} label="Activate" onClick={() => { update('users', (arr) => arr.map((x) => x.id === u.id ? { ...x, active: true } : x), { action: 'UPDATE', entity: 'User', entityId: u.id, after: 'active=true' }); toast.success('User Activated', u.name); }} />
                    ))}
                    {canDeleteUser && <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteUserId(u.id)} />}
                  </div>
                ) },
              ]}
              rows={db.users}
              rowKey={(u) => u.id}
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Integrations (Future)" subtitle="Backend-dependent — configure when backend is ready" />
          <div className="space-y-3 text-sm text-slate-500">
            <div className="flex items-center gap-2"><CreditCard size={16} /> Payment Gateway (PayHere, Stripe)</div>
            <div className="flex items-center gap-2"><Bell size={16} /> SMS / Email / Push providers</div>
            <div className="flex items-center gap-2"><Globe size={16} /> Accounting software sync (QuickBooks)</div>
            <div className="flex items-center gap-2"><Calendar size={16} /> E-signature provider</div>
            <p className="text-xs text-slate-400 mt-2">These will be configured here once the Supabase backend is connected.</p>
          </div>
        </Card>
      </div>

      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { resetData(); toast.info('Data Reset', 'Restored to seed data'); }}
        title="Reset all data?" message="This will erase all current data and restore the original seed data. This cannot be undone." confirmLabel="Reset" danger />

      <ConfirmDialog open={!!deleteUserId} onClose={() => setDeleteUserId(null)} onConfirm={() => {
        if (deleteUserId) { update('users', (arr) => arr.filter((u) => u.id !== deleteUserId), { action: 'DELETE', entity: 'User', entityId: deleteUserId }); toast.success('User Deleted'); }
        setDeleteUserId(null);
      }} title="Delete user?" message="Remove this user account?" confirmLabel="Delete" danger />

      {userModal !== null && <UserForm user={userModal === 'new' ? null : userModal} onClose={() => setUserModal(null)} onSave={(u) => {
        if (userModal !== 'new') {
          update('users', (arr) => arr.map((x) => x.id === u.id ? u : x), { action: 'UPDATE', entity: 'User', entityId: u.id });
          toast.success('User Updated', u.name);
        } else {
          const newU = { ...u, id: uid('usr'), createdAt: nowISO(), active: true };
          update('users', (arr) => [...arr, newU], { action: 'CREATE', entity: 'User', entityId: newU.id });
          toast.success('User Created', `${u.name} (${u.role})`);
        }
        setUserModal(null);
      }} />}

      {pwdModal && <PasswordForm user={pwdModal} onClose={() => setPwdModal(null)} onSave={() => {
        toast.success('Password Updated', `Credentials set for ${pwdModal.name}`);
        setPwdModal(null);
      }} />}
    </div>
  );
}

const ROLES: UserRole[] = ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Rental Staff', 'Driver', 'Corporate Contact'];

const PERMISSION_ACTIONS: { key: PermissionAction; label: string; icon: React.ReactNode }[] = [
  { key: 'view', label: 'View', icon: <Eye size={12} /> },
  { key: 'create', label: 'Create', icon: <FilePlus size={12} /> },
  { key: 'edit', label: 'Edit', icon: <Pencil size={12} /> },
  { key: 'delete', label: 'Delete', icon: <Trash size={12} /> },
];

function UserForm({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (u: User) => void }) {
  // New users start with empty permissions (admin must explicitly grant access).
  // Existing users without a permissions map are normalized to empty so the admin
  // can curate access on edit. (Legacy "all access" behaviour is preserved at
  // runtime via the `can()` helper when `user.permissions` is undefined, but
  // saving the form persists an explicit map.)
  const [form, setForm] = useState<Partial<User>>(() => ({
    role: 'Rental Staff',
    active: true,
    ...(user ?? {}),
    permissions: normalizePermissions(user?.permissions),
  }));
  const set = (k: keyof User, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const permissions = form.permissions ?? emptyPermissions();
  const setPermission = (moduleKey: string, action: PermissionAction, value: boolean) => {
    const current: ModulePermissions = permissions[moduleKey] ?? { view: false, create: false, edit: false, delete: false };
    const next: ModulePermissions = { ...current, [action]: value };
    // Granting create/edit/delete implies view; revoking view revokes the rest.
    if (action !== 'view' && value) next.view = true;
    if (action === 'view' && !value) { next.create = false; next.edit = false; next.delete = false; }
    set('permissions', { ...permissions, [moduleKey]: next });
  };

  const toggleAll = (moduleKey: string, value: boolean) => {
    set('permissions', {
      ...permissions,
      [moduleKey]: { view: value, create: value, edit: value, delete: value },
    });
  };
  const grantAll = () => {
    const all = emptyPermissions();
    for (const k of ALL_MODULE_KEYS) all[k] = { view: true, create: true, edit: true, delete: true };
    set('permissions', all);
  };
  const clearAll = () => set('permissions', emptyPermissions());

  const grouped = (['Operations', 'Finance', 'Partnership', 'System'] as const).map((g) => ({
    group: g,
    items: NAV_ITEMS.filter((n) => n.group === g),
  }));

  return (
    <Modal open onClose={onClose} title={user ? 'Edit User' : 'Add User'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as User)}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Email / Username" required><Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="user@rentflow" /></Field>
          <Field label="Role" required><Select value={form.role ?? 'Rental Staff'} onChange={(e) => set('role', e.target.value as UserRole)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          {!user && <Field label="Initial Password" hint="User can change this later"><Input type="password" value={(form as any).password ?? ''} onChange={(e) => set('password' as any, e.target.value)} /></Field>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Module Permissions</p>
              <p className="text-xs text-slate-500">Pick which modules this user can access and the actions allowed. New users start with no access.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={grantAll}>Grant all</button>
              <span className="text-slate-300">|</span>
              <button type="button" className="text-xs text-slate-500 hover:underline" onClick={clearAll}>Clear all</button>
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Module</th>
                  {PERMISSION_ACTIONS.map((a) => (
                    <th key={a.key} className="font-medium px-2 py-2 w-16 text-center">{a.label}</th>
                  ))}
                  <th className="font-medium px-2 py-2 w-16 text-center">All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grouped.map(({ group, items }) => (
                  <Fragment key={group}>
                    <tr className="bg-slate-50/50">
                      <td colSpan={6} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group}</td>
                    </tr>
                    {items.map((item) => {
                      const p = permissions[item.key] ?? { view: false, create: false, edit: false, delete: false };
                      const allOn = p.view && p.create && p.edit && p.delete;
                      return (
                        <tr key={item.key}>
                          <td className="px-3 py-1.5 text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="text-slate-400">{item.icon}</span>
                              {item.label}
                            </span>
                          </td>
                          {PERMISSION_ACTIONS.map((a) => (
                            <td key={a.key} className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={!!p[a.key]}
                                onChange={(e) => setPermission(item.key, a.key, e.target.checked)}
                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                aria-label={`${a.label} ${item.label}`}
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={allOn}
                              onChange={(e) => toggleAll(item.key, e.target.checked)}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              aria-label={`Toggle all for ${item.label}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PasswordForm({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: () => void }) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = pwd && confirm && pwd !== confirm;
  return (
    <Modal open onClose={onClose} title={`Set Password — ${user.name}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!pwd || !!mismatch} onClick={onSave}>Update Password</Button></>}>
      <div className="space-y-3">
        <Field label="New Password" required><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>
        <Field label="Confirm Password" required><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {mismatch && <p className="text-xs text-red-600">Passwords do not match</p>}
        <p className="text-xs text-slate-500">In the frontend prototype, passwords are not enforced. When the backend is connected, this will use Supabase Auth.</p>
      </div>
    </Modal>
  );
}
