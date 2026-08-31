import { useState } from 'react';
import { Plus, UserCircle, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../data/store';
import type { Driver } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { SearchInput } from '../components/ui/Tabs';
import { uid, nowISO, formatDate } from '../lib/utils';

export default function Drivers() {
  const { db, update } = useStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = db.drivers.filter((d) => {
    const q = search.toLowerCase();
    return !q || `${d.fullName} ${d.phone ?? ''} ${d.licenseNumber ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader title="Drivers" subtitle={`${db.drivers.length} drivers`} actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Driver</Button>} />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search drivers…" className="max-w-sm" /></div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<UserCircle size={40} />} title="No drivers found" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Driver</Button>} /></Card>
      ) : (
        <Card padded={false}>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (d) => <span className="font-medium">{d.fullName}</span> },
              { key: 'phone', header: 'Phone', render: (d) => d.phone ?? '—' },
              { key: 'license', header: 'License #', render: (d) => d.licenseNumber ?? '—' },
              { key: 'expiry', header: 'License Expiry', render: (d) => <span className={d.licenseExpiry && new Date(d.licenseExpiry) < new Date() ? 'text-red-600 font-medium' : ''}>{formatDate(d.licenseExpiry)}</span> },
              { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
              { key: 'actions', header: '', align: 'right', render: (d) => (
                <div className="flex gap-1 justify-end">
                  <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(d)} />
                  <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(d.id)} />
                </div>
              ) },
            ]}
            rows={filtered}
            rowKey={(d) => d.id}
          />
        </Card>
      )}

      {(creating || editing) && <DriverForm driver={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(d) => {
        if (editing) update('drivers', (arr) => arr.map((x) => x.id === d.id ? d : x), { action: 'UPDATE', entity: 'Driver', entityId: d.id });
        else { const n = { ...d, id: uid('dr'), createdAt: nowISO() }; update('drivers', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Driver', entityId: n.id }); }
        setCreating(false); setEditing(null);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) update('drivers', (arr) => arr.filter((d) => d.id !== deleteId), { action: 'DELETE', entity: 'Driver', entityId: deleteId }); }} title="Delete driver?" message="Remove this driver record?" confirmLabel="Delete" danger />
    </div>
  );
}

function DriverForm({ driver, onClose, onSave }: { driver: Driver | null; onClose: () => void; onSave: (d: Driver) => void }) {
  const [form, setForm] = useState<Partial<Driver>>(driver ?? { status: 'Active' });
  const set = (k: keyof Driver, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={driver ? 'Edit Driver' : 'Add Driver'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Driver)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Full Name" required><Input value={form.fullName ?? ''} onChange={(e) => set('fullName', e.target.value)} /></Field>
        <Field label="Phone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="License Number"><Input value={form.licenseNumber ?? ''} onChange={(e) => set('licenseNumber', e.target.value)} /></Field>
        <Field label="License Expiry"><Input type="date" value={form.licenseExpiry ? form.licenseExpiry.slice(0, 10) : ''} onChange={(e) => set('licenseExpiry', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        <Field label="Status"><Select value={form.status ?? 'Active'} onChange={(e) => set('status', e.target.value as any)}><option>Active</option><option>Inactive</option></Select></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
