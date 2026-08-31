import { useState } from 'react';
import { Plus, ShieldCheck, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { Insurance, InsuranceClaim } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum, cn } from '../lib/utils';

export default function Insurance() {
  const { db, update } = useStore();
  const toast = useToast();
  const lookups = useLookups();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Insurance | null>(null);
  const [claimModal, setClaimModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalPremium = sum(db.insurances.filter((i) => i.status === 'Active'), (i) => i.premium);
  const expiringSoon = db.insurances.filter((i) => {
    const days = (new Date(i.expiryDate).getTime() - Date.now()) / 86400000;
    return days <= 30 && days >= 0;
  }).length;
  const expired = db.insurances.filter((i) => new Date(i.expiryDate) < new Date() && i.status === 'Active').length;

  return (
    <div>
      <PageHeader title="Insurance Management" subtitle="Vehicle insurance policies and claims" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Policy</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Active Policies" value={db.insurances.filter((i) => i.status === 'Active').length} icon={<ShieldCheck size={18} />} tone="green" />
        <StatCard label="Total Premium" value={formatCurrency(totalPremium)} icon={<ShieldCheck size={18} />} />
        <StatCard label="Expiring (30d)" value={expiringSoon} icon={<AlertTriangle size={18} />} tone="amber" />
        <StatCard label="Expired" value={expired} icon={<AlertTriangle size={18} />} tone="red" />
      </div>

      <Card className="mb-4">
        <CardHeader title="Insurance Policies" />
        {db.insurances.length === 0 ? <EmptyState icon={<ShieldCheck size={40} />} title="No insurance policies" /> : (
          <DataTable
            columns={[
              { key: 'policy', header: 'Policy #', render: (i) => i.policyNumber ?? '—' },
              { key: 'vehicle', header: 'Vehicle', render: (i) => lookups.vehicleLabel(i.vehicleId) },
              { key: 'provider', header: 'Provider', render: (i) => i.provider ?? '—' },
              { key: 'type', header: 'Type', render: (i) => i.policyType ?? '—' },
              { key: 'premium', header: 'Premium', align: 'right', render: (i) => formatCurrency(i.premium) },
              { key: 'expiry', header: 'Expiry', render: (i) => <span className={cn(new Date(i.expiryDate) < new Date() && 'text-red-600 font-medium', (new Date(i.expiryDate).getTime() - Date.now()) / 86400000 <= 30 && (new Date(i.expiryDate).getTime() - Date.now()) / 86400000 > 0 && 'text-amber-600 font-medium')}>{formatDate(i.expiryDate)}</span> },
              { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
              { key: 'actions', header: '', align: 'right', render: (i) => (
                <div className="flex gap-1 justify-end">
                  <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(i)} />
                  <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(i.id)} />
                </div>
              ) },
            ]}
            rows={db.insurances}
            rowKey={(i) => i.id}
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Insurance Claims" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setClaimModal(true)}>Add Claim</Button>} />
        {db.insuranceClaims.length === 0 ? <EmptyState title="No claims filed" /> : (
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (c) => formatDate(c.date) },
              { key: 'policy', header: 'Policy', render: (c) => db.insurances.find((i) => i.id === c.insuranceId)?.policyNumber ?? '—' },
              { key: 'claim', header: 'Claim Amount', align: 'right', render: (c) => formatCurrency(c.claimAmount) },
              { key: 'settlement', header: 'Settled', align: 'right', render: (c) => c.settlementAmount ? formatCurrency(c.settlementAmount) : '—' },
              { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            ]}
            rows={db.insuranceClaims}
            rowKey={(c) => c.id}
          />
        )}
      </Card>

      {(creating || editing) && <InsuranceForm insurance={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(i) => {
        if (editing) { update('insurances', (arr) => arr.map((x) => x.id === i.id ? i : x), { action: 'UPDATE', entity: 'Insurance', entityId: i.id }); toast.success('Policy Updated', 'Insurance policy updated successfully'); }
        else { const n = { ...i, id: uid('ins'), createdAt: nowISO() }; update('insurances', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Insurance', entityId: n.id }); update('notifications', (arr) => [{ id: uid('nt'), type: 'Insurance', channel: 'Popup', subject: 'Insurance Policy Created', message: `Policy ${n.policyNumber ?? n.id} created`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]); toast.success('Policy Created', 'New insurance policy added successfully'); }
        setCreating(false); setEditing(null);
      }} />}

      {claimModal && <ClaimForm onClose={() => setClaimModal(false)} onSave={(c) => {
        const n = { ...c, id: uid('ic'), createdAt: nowISO() };
        update('insuranceClaims', (arr) => [n, ...arr], { action: 'CREATE', entity: 'InsuranceClaim', entityId: n.id });
        update('notifications', (arr) => [{ id: uid('nt'), type: 'Insurance', channel: 'Popup', subject: 'Insurance Claim Created', message: `Claim ${n.id} filed`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
        toast.success('Claim Created', 'Insurance claim filed successfully');
        setClaimModal(false);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { update('insurances', (arr) => arr.filter((i) => i.id !== deleteId), { action: 'DELETE', entity: 'Insurance', entityId: deleteId }); toast.success('Policy Deleted', 'Insurance policy removed'); } }} title="Delete policy?" message="Remove this insurance policy?" confirmLabel="Delete" danger />
    </div>
  );
}

function InsuranceForm({ insurance, onClose, onSave }: { insurance: Insurance | null; onClose: () => void; onSave: (i: Insurance) => void }) {
  const { db } = useStore();
  const [form, setForm] = useState<Partial<Insurance>>(insurance ?? { status: 'Active', startDate: nowISO(), premium: 0, expiryDate: nowISO() });
  const set = (k: keyof Insurance, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={insurance ? 'Edit Policy' : 'Add Policy'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Insurance)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Vehicle" required><Select value={form.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)}><option value="">—</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNumber} — {v.make} {v.model}</option>)}</Select></Field>
        <Field label="Provider"><Input value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value)} /></Field>
        <Field label="Policy Number"><Input value={form.policyNumber ?? ''} onChange={(e) => set('policyNumber', e.target.value)} /></Field>
        <Field label="Policy Type"><Select value={form.policyType ?? ''} onChange={(e) => set('policyType', e.target.value)}><option value="">—</option><option>Comprehensive</option><option>Third Party</option><option>Third Party Fire & Theft</option></Select></Field>
        <Field label="Start Date" required><Input type="date" value={form.startDate ? form.startDate.slice(0, 10) : ''} onChange={(e) => set('startDate', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Expiry Date" required><Input type="date" value={form.expiryDate ? form.expiryDate.slice(0, 10) : ''} onChange={(e) => set('expiryDate', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Premium"><Input type="number" value={form.premium ?? ''} onChange={(e) => set('premium', +e.target.value)} /></Field>
        <Field label="Excess / Deductible"><Input type="number" value={form.excess ?? ''} onChange={(e) => set('excess', +e.target.value)} /></Field>
        <Field label="Coverage"><Textarea value={form.coverage ?? ''} onChange={(e) => set('coverage', e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status ?? 'Active'} onChange={(e) => set('status', e.target.value as any)}><option>Active</option><option>Expired</option><option>Claim in Progress</option></Select></Field>
      </div>
    </Modal>
  );
}

function ClaimForm({ onClose, onSave }: { onClose: () => void; onSave: (c: Omit<InsuranceClaim, 'id' | 'createdAt'>) => void }) {
  const { db } = useStore();
  const [form, setForm] = useState<Partial<InsuranceClaim>>({ date: nowISO(), claimAmount: 0, status: 'Filed' });
  const set = (k: keyof InsuranceClaim, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title="Add Insurance Claim"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as any)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Policy" required><Select value={form.insuranceId ?? ''} onChange={(e) => set('insuranceId', e.target.value)}><option value="">—</option>{db.insurances.map((i) => <option key={i.id} value={i.id}>{i.policyNumber} — {i.provider}</option>)}</Select></Field>
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Claim Amount" required><Input type="number" value={form.claimAmount ?? ''} onChange={(e) => set('claimAmount', +e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status ?? 'Filed'} onChange={(e) => set('status', e.target.value as any)}><option>Filed</option><option>Under Review</option><option>Approved</option><option>Settled</option><option>Rejected</option></Select></Field>
        <Field label="Settlement Amount"><Input type="number" value={form.settlementAmount ?? ''} onChange={(e) => set('settlementAmount', +e.target.value)} /></Field>
        <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
