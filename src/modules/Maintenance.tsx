import { useState } from 'react';
import { Plus, Wrench, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { Maintenance, MaintenanceType } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { VendorSelect } from '../components/ui/VendorSelect';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum } from '../lib/utils';

const TYPES: MaintenanceType[] = ['Preventive', 'Corrective', 'Oil Change', 'Tyres', 'Battery', 'Brake', 'Engine', 'Transmission', 'AC', 'Cleaning', 'Other'];

export default function Maintenance() {
  const { db, update } = useStore();
  const toast = useToast();
  const lookups = useLookups();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalCost = sum(db.maintenances, (m) => m.totalCost);
  const dueSoon = db.maintenances.filter((m) => m.nextServiceDate && new Date(m.nextServiceDate) <= new Date(Date.now() + 7 * 86400000)).length;

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Vehicle service and repair records" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Record</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Total Records" value={db.maintenances.length} icon={<Wrench size={18} />} />
        <StatCard label="Total Cost" value={formatCurrency(totalCost)} icon={<Wrench size={18} />} tone="red" />
        <StatCard label="Due in 7 days" value={dueSoon} icon={<Wrench size={18} />} tone="amber" />
      </div>

      {db.maintenances.length === 0 ? (
        <Card><EmptyState icon={<Wrench size={40} />} title="No maintenance records" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Record</Button>} /></Card>
      ) : (
        <Card padded={false}>
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (m) => formatDate(m.serviceDate) },
              { key: 'vehicle', header: 'Vehicle', render: (m) => lookups.vehicleLabel(m.vehicleId) },
              { key: 'type', header: 'Type', render: (m) => <StatusBadge status={m.type} /> },
              { key: 'odo', header: 'Odometer', align: 'right', render: (m) => `${m.odometer.toLocaleString()} km` },
              { key: 'work', header: 'Work Performed', render: (m) => <span className="truncate block max-w-[200px]">{m.workPerformed ?? '—'}</span> },
              { key: 'cost', header: 'Cost', align: 'right', render: (m) => formatCurrency(m.totalCost) },
              { key: 'next', header: 'Next Service', render: (m) => m.nextServiceDate ? formatDate(m.nextServiceDate) : '—' },
              { key: 'actions', header: '', align: 'right', render: (m) => (
                <div className="flex gap-1 justify-end">
                  <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(m)} />
                  <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(m.id)} />
                </div>
              ) },
            ]}
            rows={db.maintenances}
            rowKey={(m) => m.id}
          />
        </Card>
      )}

      {(creating || editing) && <MaintForm maintenance={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(m) => {
        if (editing) { update('maintenances', (arr) => arr.map((x) => x.id === m.id ? m : x), { action: 'UPDATE', entity: 'Maintenance', entityId: m.id }); toast.success('Record Updated', 'Maintenance record updated successfully'); }
        else { const n = { ...m, id: uid('mt'), createdAt: nowISO() }; update('maintenances', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Maintenance', entityId: n.id }); update('notifications', (arr) => [{ id: uid('nt'), type: 'Maintenance', channel: 'Popup', subject: 'Maintenance Record Created', message: `Record ${n.id} created`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]); toast.success('Record Created', 'Maintenance record added successfully'); }
        setCreating(false); setEditing(null);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { update('maintenances', (arr) => arr.filter((m) => m.id !== deleteId), { action: 'DELETE', entity: 'Maintenance', entityId: deleteId }); toast.success('Record Deleted', 'Maintenance record removed'); } }} title="Delete record?" message="Remove this maintenance record?" confirmLabel="Delete" danger />
    </div>
  );
}

function MaintForm({ maintenance, onClose, onSave }: { maintenance: Maintenance | null; onClose: () => void; onSave: (m: Maintenance) => void }) {
  const { db } = useStore();
  const [form, setForm] = useState<Partial<Maintenance>>(maintenance ?? { serviceDate: nowISO(), odometer: 0, totalCost: 0, type: 'Preventive' });
  const set = (k: keyof Maintenance, v: any) => setForm((f) => {
    const next = { ...f, [k]: v };
    next.totalCost = (next.labourCost ?? 0) + (next.partsCost ?? 0);
    return next;
  });
  return (
    <Modal open onClose={onClose} title={maintenance ? 'Edit Maintenance' : 'Add Maintenance'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Maintenance)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Vehicle" required><Select value={form.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)}><option value="">—</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNumber} — {v.make} {v.model}</option>)}</Select></Field>
        <Field label="Type" required><Select value={form.type} onChange={(e) => set('type', e.target.value as MaintenanceType)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Service Date" required><Input type="date" value={form.serviceDate ? form.serviceDate.slice(0, 10) : ''} onChange={(e) => set('serviceDate', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Odometer (km)"><Input type="number" value={form.odometer ?? ''} onChange={(e) => set('odometer', +e.target.value)} /></Field>
        <Field label="Work Performed" className="sm:col-span-2"><Textarea value={form.workPerformed ?? ''} onChange={(e) => set('workPerformed', e.target.value)} /></Field>
        <Field label="Parts"><Input value={form.parts ?? ''} onChange={(e) => set('parts', e.target.value)} /></Field>
        <Field label="Vendor"><VendorSelect value={form.vendorId} onChange={(v) => set('vendorId', v)} /></Field>
        <Field label="Labour Cost"><Input type="number" value={form.labourCost ?? ''} onChange={(e) => set('labourCost', +e.target.value)} /></Field>
        <Field label="Parts Cost"><Input type="number" value={form.partsCost ?? ''} onChange={(e) => set('partsCost', +e.target.value)} /></Field>
        <Field label="Next Service Date"><Input type="date" value={form.nextServiceDate ? form.nextServiceDate.slice(0, 10) : ''} onChange={(e) => set('nextServiceDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        <Field label="Next Service Mileage"><Input type="number" value={form.nextServiceMileage ?? ''} onChange={(e) => set('nextServiceMileage', +e.target.value)} /></Field>
        <Field label="Total Cost"><Input value={form.totalCost ?? 0} disabled /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
