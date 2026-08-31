import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Edit2, Trash2, ArrowLeft, Building2, User } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { Customer, CustomerType, CustomerStatus } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Tabs, SearchInput } from '../components/ui/Tabs';
import { uid, nowISO, formatCurrency, formatDate } from '../lib/utils';

export default function Customers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { db, update } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (id) return <CustomerDetail customerId={id} onBack={() => navigate('/customers')} />;

  const filtered = db.customers
    .filter((c) => tab === 'all' || (tab === 'Individual' && c.type === 'Individual') || (tab === 'Corporate' && c.type === 'Corporate'))
    .filter((c) => {
      const q = search.toLowerCase();
      return !q || `${c.fullName ?? ''} ${c.companyName ?? ''} ${c.phone ?? ''} ${c.email ?? ''} ${c.nic ?? ''}`.toLowerCase().includes(q);
    });

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${db.customers.length} customers`} actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Customer</Button>} />
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, NIC…" className="flex-1" />
      </div>
      <Tabs tabs={[
        { key: 'all', label: 'All', count: db.customers.length },
        { key: 'Individual', label: 'Individual', count: db.customers.filter((c) => c.type === 'Individual').length },
        { key: 'Corporate', label: 'Corporate', count: db.customers.filter((c) => c.type === 'Corporate').length },
      ]} active={tab} onChange={setTab} />

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card><EmptyState icon={<Users size={40} />} title="No customers found" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Customer</Button>} /></Card>
        ) : (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (c) => (
                  <div className="flex items-center gap-2">
                    {c.type === 'Corporate' ? <Building2 size={16} className="text-slate-400" /> : <User size={16} className="text-slate-400" />}
                    <div>
                      <p className="font-medium text-slate-900">{c.type === 'Corporate' ? c.companyName : c.fullName}</p>
                      <p className="text-xs text-slate-500">{c.phone ?? c.email ?? '—'}</p>
                    </div>
                  </div>
                ) },
                { key: 'type', header: 'Type', render: (c) => c.type },
                { key: 'credit', header: 'Credit Limit', render: (c) => c.type === 'Corporate' ? formatCurrency(c.creditLimit ?? 0) : '—' },
                { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
              ]}
              rows={filtered}
              rowKey={(c) => c.id}
              onRowClick={(c) => navigate(`/customers/${c.id}`)}
            />
          </Card>
        )}
      </div>

      {(creating || editing) && (
        <CustomerForm customer={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(c) => {
          if (editing) {
            update('customers', (arr) => arr.map((x) => x.id === c.id ? { ...c, updatedAt: nowISO() } : x), { action: 'UPDATE', entity: 'Customer', entityId: c.id });
            toast.success('Customer Updated', c.type === 'Corporate' ? c.companyName : c.fullName);
          } else {
            const newC = { ...c, id: uid('cu'), createdAt: nowISO(), updatedAt: nowISO() };
            update('customers', (arr) => [newC, ...arr], { action: 'CREATE', entity: 'Customer', entityId: newC.id });
            update('notifications', (arr) => [{ id: uid('nt'), type: 'Customer', channel: 'Popup', subject: 'Customer Added', message: (c.type === 'Corporate' ? c.companyName : c.fullName) ?? '', scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
            toast.success('Customer Added', c.type === 'Corporate' ? c.companyName : c.fullName);
          }
          setCreating(false); setEditing(null);
        }} />
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => {
        if (deleteId) { update('customers', (arr) => arr.filter((c) => c.id !== deleteId), { action: 'DELETE', entity: 'Customer', entityId: deleteId }); toast.success('Customer Deleted'); }
      }} title="Delete customer?" message="This will permanently remove the customer." confirmLabel="Delete" danger />
    </div>
  );
}

function CustomerDetail({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const { db, update } = useStore();
  const toast = useToast();
  const lookups = useLookups();
  const customer = db.customers.find((c) => c.id === customerId);
  const [editing, setEditing] = useState(false);

  if (!customer) return <EmptyState title="Customer not found" action={<Button onClick={onBack}>Back</Button>} />;

  const bookings = db.bookings.filter((b) => b.customerId === customerId);
  const payments = db.payments.filter((p) => p.customerId === customerId);
  const outstanding = bookings.reduce((acc, b) => {
    const paid = db.payments.filter((p) => p.bookingId === b.id && !p.isDeposit && p.status === 'Paid').reduce((a, p) => a + p.amount, 0);
    const total = b.rentalDays * b.dailyRate + (b.additionalCharges ?? 0) - (b.discount ?? 0);
    return acc + Math.max(total - paid, 0);
  }, 0);

  return (
    <div>
      <button className="btn-ghost mb-3 -ml-2" onClick={onBack}><ArrowLeft size={16} /> Back to customers</button>
      <PageHeader title={customer.type === 'Corporate' ? customer.companyName ?? '' : customer.fullName ?? ''} subtitle={customer.type} actions={<Button variant="secondary" icon={<Edit2 size={16} />} onClick={() => setEditing(true)}>Edit</Button>} />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile" />
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {customer.type === 'Individual' ? (
              <>
                <Row label="NIC / Passport" value={customer.nic ?? '—'} />
                <Row label="Driving License" value={customer.drivingLicense ?? '—'} />
                <Row label="License Expiry" value={formatDate(customer.drivingLicenseExpiry)} />
                <Row label="Date of Birth" value={formatDate(customer.dateOfBirth)} />
              </>
            ) : (
              <>
                <Row label="Business Reg." value={customer.businessRegNumber ?? '—'} />
                <Row label="Credit Terms" value={customer.creditTermsDays ? `Net ${customer.creditTermsDays}` : '—'} />
                <Row label="Credit Limit" value={formatCurrency(customer.creditLimit ?? 0)} />
                <Row label="Authorized Drivers" value={customer.authorizedDrivers?.join(', ') ?? '—'} />
              </>
            )}
            <Row label="Phone" value={customer.phone ?? '—'} />
            <Row label="Email" value={customer.email ?? '—'} />
            <Row label="Address" value={customer.address ?? '—'} />
            <Row label="Emergency Contact" value={customer.emergencyContact ?? '—'} />
            <Row label="Status" value={<StatusBadge status={customer.status} />} />
          </div>
          {customer.contacts && customer.contacts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Contacts</p>
              {customer.contacts.map((ct, i) => <div key={i} className="text-sm">{ct.name} · {ct.phone} {ct.email && `· ${ct.email}`}</div>)}
            </div>
          )}
          {customer.notes && <div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs text-slate-500">Notes</p><p className="text-sm text-slate-700 mt-1">{customer.notes}</p></div>}
        </Card>

        <Card>
          <CardHeader title="Summary" />
          <div className="space-y-3 text-sm">
            <Row label="Total Bookings" value={String(bookings.length)} />
            <Row label="Total Revenue" value={formatCurrency(payments.filter((p) => !p.isDeposit).reduce((a, p) => a + p.amount, 0))} />
            <Row label="Outstanding" value={formatCurrency(outstanding)} />
            <Row label="Customer Since" value={formatDate(customer.createdAt)} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Booking History" />
        {bookings.length === 0 ? <EmptyState title="No bookings" /> : (
          <DataTable
            columns={[
              { key: 'number', header: 'Booking', render: (b) => <Link to={`/bookings/${b.id}`} className="text-brand-600 hover:underline">{b.number}</Link> },
              { key: 'vehicle', header: 'Vehicle', render: (b) => lookups.vehicleLabel(b.vehicleId) },
              { key: 'pickup', header: 'Pickup', render: (b) => formatDate(b.pickupAt) },
              { key: 'return', header: 'Return', render: (b) => formatDate(b.returnAt) },
              { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
            ]}
            rows={bookings}
            rowKey={(b) => b.id}
            onRowClick={(b) => window.location.assign(`/bookings/${b.id}`)}
          />
        )}
      </Card>

      {editing && <CustomerForm customer={customer} onClose={() => setEditing(false)} onSave={(c) => {
        update('customers', (arr) => arr.map((x) => x.id === c.id ? { ...c, updatedAt: nowISO() } : x), { action: 'UPDATE', entity: 'Customer', entityId: c.id });
        toast.success('Customer Updated', c.type === 'Corporate' ? c.companyName : c.fullName);
        setEditing(false);
      }} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0"><span className="text-slate-500">{label}</span><span className="text-slate-900 font-medium text-right">{value}</span></div>;
}

function CustomerForm({ customer, onClose, onSave }: { customer: Customer | null; onClose: () => void; onSave: (c: Customer) => void }) {
  const [form, setForm] = useState<Partial<Customer>>(customer ?? { type: 'Individual', status: 'Active' });
  const set = (k: keyof Customer, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isCorp = form.type === 'Corporate';

  return (
    <Modal open onClose={onClose} title={customer ? 'Edit Customer' : 'Add Customer'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Customer)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Customer Type" required><Select value={form.type} onChange={(e) => set('type', e.target.value as CustomerType)}><option>Individual</option><option>Corporate</option></Select></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => set('status', e.target.value as CustomerStatus)}><option>Active</option><option>Inactive</option><option>Blacklisted</option></Select></Field>

        {isCorp ? (
          <>
            <Field label="Company Name" required><Input value={form.companyName ?? ''} onChange={(e) => set('companyName', e.target.value)} /></Field>
            <Field label="Business Reg. Number"><Input value={form.businessRegNumber ?? ''} onChange={(e) => set('businessRegNumber', e.target.value)} /></Field>
            <Field label="Credit Terms (days)"><Input type="number" value={form.creditTermsDays ?? ''} onChange={(e) => set('creditTermsDays', +e.target.value)} /></Field>
            <Field label="Credit Limit"><Input type="number" value={form.creditLimit ?? ''} onChange={(e) => set('creditLimit', +e.target.value)} /></Field>
            <Field label="Authorized Drivers (comma separated)" className="sm:col-span-2"><Input value={form.authorizedDrivers?.join(', ') ?? ''} onChange={(e) => set('authorizedDrivers', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
          </>
        ) : (
          <>
            <Field label="Full Name" required><Input value={form.fullName ?? ''} onChange={(e) => set('fullName', e.target.value)} /></Field>
            <Field label="NIC / Passport"><Input value={form.nic ?? ''} onChange={(e) => set('nic', e.target.value)} /></Field>
            <Field label="Driving License"><Input value={form.drivingLicense ?? ''} onChange={(e) => set('drivingLicense', e.target.value)} /></Field>
            <Field label="License Expiry"><Input type="date" value={form.drivingLicenseExpiry ? form.drivingLicenseExpiry.slice(0, 10) : ''} onChange={(e) => set('drivingLicenseExpiry', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
            <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth ? form.dateOfBirth.slice(0, 10) : ''} onChange={(e) => set('dateOfBirth', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
          </>
        )}

        <Field label="Phone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Emergency Contact"><Input value={form.emergencyContact ?? ''} onChange={(e) => set('emergencyContact', e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
