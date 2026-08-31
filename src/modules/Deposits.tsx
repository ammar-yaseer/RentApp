import { useState } from 'react';
import { Plus, Banknote, Edit2 } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { Deposit } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum } from '../lib/utils';

const METHODS = ['Cash', 'Card', 'Bank Transfer', 'Online Gateway', 'Cheque', 'Other'];

export default function Deposits() {
  const { db, update } = useStore();
  const toast = useToast();
  const lookups = useLookups();
  const [editing, setEditing] = useState<Deposit | null>(null);

  const totalHeld = sum(db.deposits.filter((d) => d.status === 'Held'), (d) => d.received - (d.deductions ?? 0));
  const totalRefunded = sum(db.deposits.filter((d) => d.status !== 'Held'), (d) => d.refundAmount ?? 0);

  return (
    <div>
      <PageHeader title="Security Deposits" subtitle="Refundable deposits — never recorded as revenue" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Currently Held" value={formatCurrency(totalHeld)} icon={<Banknote size={18} />} tone="amber" />
        <StatCard label="Refunded" value={formatCurrency(totalRefunded)} icon={<Banknote size={18} />} tone="green" />
        <StatCard label="Total Deposits" value={db.deposits.length} icon={<Banknote size={18} />} />
      </div>

      {db.deposits.length === 0 ? (
        <Card><EmptyState icon={<Banknote size={40} />} title="No deposits recorded" subtitle="Deposits are created automatically when bookings with deposits are made" /></Card>
      ) : (
        <Card padded={false}>
          <DataTable
            columns={[
              { key: 'booking', header: 'Booking', render: (d) => db.bookings.find((b) => b.id === d.bookingId)?.number ?? '—' },
              { key: 'customer', header: 'Customer', render: (d) => lookups.customerLabel(d.customerId) },
              { key: 'required', header: 'Required', align: 'right', render: (d) => formatCurrency(d.required) },
              { key: 'received', header: 'Received', align: 'right', render: (d) => formatCurrency(d.received) },
              { key: 'deductions', header: 'Deductions', align: 'right', render: (d) => d.deductions ? formatCurrency(d.deductions) : '—' },
              { key: 'refund', header: 'Refund', align: 'right', render: (d) => d.refundAmount ? formatCurrency(d.refundAmount) : '—' },
              { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
              { key: 'actions', header: '', align: 'right', render: (d) => <IconButton icon={<Edit2 size={14} />} label="Process refund" onClick={() => setEditing(d)} /> },
            ]}
            rows={db.deposits}
            rowKey={(d) => d.id}
          />
        </Card>
      )}

      {editing && <DepositForm deposit={editing} onClose={() => setEditing(null)} onSave={(d) => {
        update('deposits', (arr) => arr.map((x) => x.id === d.id ? d : x), { action: 'UPDATE', entity: 'Deposit', entityId: d.id });
        update('notifications', (arr) => [{ id: uid('nt'), type: 'Deposit', channel: 'Popup', subject: 'Deposit Updated', message: `Refund ${formatCurrency(d.refundAmount ?? 0)} — ${d.status}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
        toast.success('Deposit Updated', `Refund ${formatCurrency(d.refundAmount ?? 0)} — ${d.status}`);
        setEditing(null);
      }} />}
    </div>
  );
}

function DepositForm({ deposit, onClose, onSave }: { deposit: Deposit; onClose: () => void; onSave: (d: Deposit) => void }) {
  const [form, setForm] = useState<Deposit>(deposit);
  const set = (k: keyof Deposit, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const net = form.received - (form.deductions ?? 0);

  return (
    <Modal open onClose={onClose} title="Process Deposit Refund" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Received Amount"><Input value={form.received} disabled /></Field>
        <Field label="Deductions"><Input type="number" value={form.deductions ?? ''} onChange={(e) => set('deductions', +e.target.value)} /></Field>
        <Field label="Deduction Reason"><Textarea value={form.deductionReason ?? ''} onChange={(e) => set('deductionReason', e.target.value)} /></Field>
        <Field label="Refund Amount"><Input type="number" value={form.refundAmount ?? net} onChange={(e) => set('refundAmount', +e.target.value)} /></Field>
        <Field label="Refund Date"><Input type="date" value={form.refundDate ? form.refundDate.slice(0, 10) : ''} onChange={(e) => set('refundDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        <Field label="Refund Method"><Select value={form.refundMethod ?? ''} onChange={(e) => set('refundMethod', e.target.value)}><option value="">—</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Status" className="sm:col-span-2"><Select value={form.status} onChange={(e) => set('status', e.target.value as any)}><option>Held</option><option>Partially Refunded</option><option>Refunded</option><option>Forfeited</option></Select></Field>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-amber-50 text-sm flex justify-between">
        <span className="text-amber-700">Net refundable (received − deductions)</span>
        <span className="font-semibold text-amber-700">{formatCurrency(net)}</span>
      </div>
    </Modal>
  );
}
