import { useState } from 'react';
import { Plus, Wallet, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { Payment, PaymentMethod, PaymentStatus } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Tabs, SearchInput } from '../components/ui/Tabs';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum } from '../lib/utils';

const METHODS: PaymentMethod[] = ['Cash', 'Card', 'Bank Transfer', 'Online Gateway', 'Cheque', 'Other'];

export default function Payments() {
  const { db, update, nextSeq } = useStore();
  const toast = useToast();
  const lookups = useLookups();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = db.payments
    .filter((p) => tab === 'all' || (tab === 'deposit' ? p.isDeposit : !p.isDeposit))
    .filter((p) => {
      const q = search.toLowerCase();
      return !q || `${p.number} ${lookups.customerLabel(p.customerId)} ${p.method}`.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalReceived = sum(db.payments.filter((p) => p.status === 'Paid' && !p.isDeposit), (p) => p.amount);
  const depositsHeld = sum(db.payments.filter((p) => p.isDeposit && p.status === 'Held' as any), (p) => p.amount);

  return (
    <div>
      <PageHeader title="Payments" subtitle="All rental and deposit payments" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Record Payment</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Received" value={formatCurrency(totalReceived)} icon={<Wallet size={18} />} tone="green" />
        <StatCard label="Deposits Held" value={formatCurrency(depositsHeld)} icon={<Wallet size={18} />} tone="amber" />
        <StatCard label="Total Payments" value={db.payments.length} icon={<Wallet size={18} />} />
        <StatCard label="Pending" value={db.payments.filter((p) => p.status === 'Pending').length} icon={<Wallet size={18} />} tone="amber" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search payments…" className="flex-1" />
      </div>
      <Tabs tabs={[
        { key: 'all', label: 'All', count: db.payments.length },
        { key: 'rental', label: 'Rental', count: db.payments.filter((p) => !p.isDeposit).length },
        { key: 'deposit', label: 'Deposits', count: db.payments.filter((p) => p.isDeposit).length },
      ]} active={tab} onChange={setTab} />

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card><EmptyState icon={<Wallet size={40} />} title="No payments found" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Record Payment</Button>} /></Card>
        ) : (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'number', header: 'Payment #', render: (p) => <span className="font-medium">{p.number}</span> },
                { key: 'booking', header: 'Booking', render: (p) => p.bookingId ? db.bookings.find((b) => b.id === p.bookingId)?.number ?? '—' : '—' },
                { key: 'customer', header: 'Customer', render: (p) => lookups.customerLabel(p.customerId) },
                { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatCurrency(p.amount) },
                { key: 'method', header: 'Method', render: (p) => p.method },
                { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
                { key: 'type', header: 'Type', render: (p) => p.isDeposit ? 'Deposit' : 'Rental' },
                { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
                { key: 'actions', header: '', align: 'right', render: (p) => (
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(p)} />
                    <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(p.id)} />
                  </div>
                ) },
              ]}
              rows={filtered}
              rowKey={(p) => p.id}
            />
          </Card>
        )}
      </div>

      {(creating || editing) && <PaymentForm payment={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(p) => {
        if (editing) { update('payments', (arr) => arr.map((x) => x.id === p.id ? p : x), { action: 'UPDATE', entity: 'Payment', entityId: p.id }); toast.success('Payment Updated', `${formatCurrency(p.amount)} via ${p.method}`); }
        else {
          const number = nextSeq('payment');
          const n = { ...p, id: uid('pm'), number, createdAt: nowISO() };
          update('payments', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Payment', entityId: n.id });
          update('notifications', (arr) => [{ id: uid('nt'), type: 'Payment', channel: 'Popup', subject: 'Payment Recorded', message: `${formatCurrency(p.amount)} via ${p.method}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
          toast.success('Payment Recorded', `${formatCurrency(p.amount)} via ${p.method}`);
        }
        setCreating(false); setEditing(null);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { update('payments', (arr) => arr.filter((p) => p.id !== deleteId), { action: 'DELETE', entity: 'Payment', entityId: deleteId }); toast.success('Payment Deleted'); } }} title="Delete payment?" message="Remove this payment record?" confirmLabel="Delete" danger />
    </div>
  );
}

function PaymentForm({ payment, onClose, onSave }: { payment: Payment | null; onClose: () => void; onSave: (p: Payment) => void }) {
  const { db } = useStore();
  const lookups = useLookups();
  const [form, setForm] = useState<Partial<Payment>>(payment ?? { status: 'Paid', method: 'Cash', date: nowISO(), amount: 0 });
  const set = (k: keyof Payment, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open onClose={onClose} title={payment ? 'Edit Payment' : 'Record Payment'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Payment)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Booking"><Select value={form.bookingId ?? ''} onChange={(e) => {
          const b = db.bookings.find((x) => x.id === e.target.value);
          set('bookingId', e.target.value || undefined);
          if (b) set('customerId', b.customerId);
        }}><option value="">Standalone payment</option>{db.bookings.map((b) => <option key={b.id} value={b.id}>{b.number} — {lookups.customerLabel(b.customerId)}</option>)}</Select></Field>
        <Field label="Customer"><Select value={form.customerId ?? ''} onChange={(e) => set('customerId', e.target.value || undefined)}><option value="">—</option>{db.customers.map((c) => <option key={c.id} value={c.id}>{c.type === 'Corporate' ? c.companyName : c.fullName}</option>)}</Select></Field>
        <Field label="Amount" required><Input type="number" value={form.amount ?? ''} onChange={(e) => set('amount', +e.target.value)} /></Field>
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Method"><Select value={form.method ?? 'Cash'} onChange={(e) => set('method', e.target.value as PaymentMethod)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Status"><Select value={form.status ?? 'Paid'} onChange={(e) => set('status', e.target.value as PaymentStatus)}><option>Pending</option><option>Partially Paid</option><option>Paid</option><option>Refunded</option><option>Failed</option><option>Cancelled</option></Select></Field>
        <Field label="Reference"><Input value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} /></Field>
        <Field label="Received By"><Input value={form.receivedBy ?? ''} onChange={(e) => set('receivedBy', e.target.value)} /></Field>
        <Field label="Gateway Txn ID"><Input value={form.gatewayTxnId ?? ''} onChange={(e) => set('gatewayTxnId', e.target.value)} /></Field>
        <Field label="Is Deposit?"><Select value={form.isDeposit ? 'yes' : 'no'} onChange={(e) => set('isDeposit', e.target.value === 'yes')}><option value="no">No — Rental payment</option><option value="yes">Yes — Security deposit</option></Select></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
