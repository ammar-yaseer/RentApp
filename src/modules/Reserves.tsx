import { useState } from 'react';
import { Plus, PiggyBank, Edit2, ArrowRightLeft } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import type { ReserveAccount, ReserveTransaction, ReserveType, ReserveContributionMethod } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum } from '../lib/utils';

const TYPES: ReserveType[] = ['Insurance', 'Maintenance', 'Emergency', 'Lease'];
const METHODS: ReserveContributionMethod[] = ['Fixed', 'Percent Revenue', 'Percent Profit', 'Manual'];

export default function Reserves() {
  const { db, update } = useStore();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ReserveAccount | null>(null);
  const [txnModal, setTxnModal] = useState<ReserveAccount | null>(null);

  const totalReserves = sum(db.reserveAccounts, (r) => r.currentBalance);

  return (
    <div>
      <PageHeader title="Reserves" subtitle="Ring-fenced funds for insurance, maintenance, emergency" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Reserve</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Total Reserved" value={formatCurrency(totalReserves)} icon={<PiggyBank size={18} />} tone="green" />
        <StatCard label="Reserve Accounts" value={db.reserveAccounts.length} icon={<PiggyBank size={18} />} />
        <StatCard label="Transactions" value={db.reserveTransactions.length} icon={<PiggyBank size={18} />} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {db.reserveAccounts.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500"><StatusBadge status={r.type} /></p>
              </div>
              <div className="flex gap-1">
                <IconButton icon={<ArrowRightLeft size={14} />} label="Transaction" onClick={() => setTxnModal(r)} />
                <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(r)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{formatCurrency(r.currentBalance)}</p>
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              <p>Opening: {formatCurrency(r.openingBalance)}</p>
              {r.monthlyTarget && <p>Monthly target: {formatCurrency(r.monthlyTarget)}</p>}
              <p>Contribution: {r.contributionMethod}{r.contributionValue ? ` (${r.contributionValue}${r.contributionMethod.includes('Percent') ? '%' : ''})` : ''}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Reserve Transactions" />
        {db.reserveTransactions.length === 0 ? <EmptyState title="No transactions" /> : (
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
              { key: 'reserve', header: 'Reserve', render: (t) => db.reserveAccounts.find((r) => r.id === t.reserveId)?.name ?? '—' },
              { key: 'type', header: 'Type', render: (t) => t.type },
              { key: 'amount', header: 'Amount', align: 'right', render: (t) => <span className={t.type === 'Contribution' ? 'text-green-600' : 'text-red-600'}>{t.type === 'Contribution' ? '+' : '-'}{formatCurrency(t.amount)}</span> },
              { key: 'notes', header: 'Notes', render: (t) => t.notes ?? '—' },
            ]}
            rows={[...db.reserveTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
            rowKey={(t) => t.id}
          />
        )}
      </Card>

      {(creating || editing) && <ReserveForm reserve={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(r) => {
        if (editing) { update('reserveAccounts', (arr) => arr.map((x) => x.id === r.id ? r : x), { action: 'UPDATE', entity: 'ReserveAccount', entityId: r.id }); toast.success('Reserve Updated', 'Reserve account updated successfully'); }
        else { const n = { ...r, id: uid('ra'), createdAt: nowISO(), currentBalance: r.openingBalance }; update('reserveAccounts', (arr) => [n, ...arr], { action: 'CREATE', entity: 'ReserveAccount', entityId: n.id }); update('notifications', (arr) => [{ id: uid('nt'), type: 'Reserve', channel: 'Popup', subject: 'Reserve Created', message: `${n.name} created`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]); toast.success('Reserve Created', 'New reserve account added successfully'); }
        setCreating(false); setEditing(null);
      }} />}

      {txnModal && <TxnForm reserve={txnModal} onClose={() => setTxnModal(null)} onSave={(t) => {
        const n = { ...t, id: uid('rt'), createdAt: nowISO() };
        update('reserveTransactions', (arr) => [n, ...arr], { action: 'CREATE', entity: 'ReserveTransaction', entityId: n.id });
        update('reserveAccounts', (arr) => arr.map((r) => r.id === t.reserveId ? { ...r, currentBalance: r.currentBalance + (t.type === 'Contribution' ? t.amount : -t.amount) } : r));
        update('notifications', (arr) => [{ id: uid('nt'), type: 'Reserve', channel: 'Popup', subject: 'Reserve Transaction Added', message: `${t.type} of ${t.amount}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
        toast.success('Transaction Added', 'Reserve transaction recorded successfully');
        setTxnModal(null);
      }} />}
    </div>
  );
}

function ReserveForm({ reserve, onClose, onSave }: { reserve: ReserveAccount | null; onClose: () => void; onSave: (r: ReserveAccount) => void }) {
  const [form, setForm] = useState<Partial<ReserveAccount>>(reserve ?? { type: 'Insurance', openingBalance: 0, currentBalance: 0, contributionMethod: 'Fixed' });
  const set = (k: keyof ReserveAccount, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={reserve ? 'Edit Reserve' : 'Add Reserve'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as ReserveAccount)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Type" required><Select value={form.type ?? 'Insurance'} onChange={(e) => set('type', e.target.value as ReserveType)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Opening Balance"><Input type="number" value={form.openingBalance ?? ''} onChange={(e) => set('openingBalance', +e.target.value)} /></Field>
        <Field label="Monthly Target"><Input type="number" value={form.monthlyTarget ?? ''} onChange={(e) => set('monthlyTarget', +e.target.value)} /></Field>
        <Field label="Contribution Method"><Select value={form.contributionMethod ?? 'Fixed'} onChange={(e) => set('contributionMethod', e.target.value as ReserveContributionMethod)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Contribution Value"><Input type="number" value={form.contributionValue ?? ''} onChange={(e) => set('contributionValue', +e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function TxnForm({ reserve, onClose, onSave }: { reserve: ReserveAccount; onClose: () => void; onSave: (t: Omit<ReserveTransaction, 'id' | 'createdAt'>) => void }) {
  const [form, setForm] = useState<Partial<ReserveTransaction>>({ reserveId: reserve.id, type: 'Contribution', amount: 0, date: nowISO() });
  const set = (k: keyof ReserveTransaction, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={`Transaction — ${reserve.name}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as any)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Type" required><Select value={form.type ?? 'Contribution'} onChange={(e) => set('type', e.target.value)}><option>Contribution</option><option>Withdrawal</option><option>Transfer</option></Select></Field>
        <Field label="Amount" required><Input type="number" value={form.amount ?? ''} onChange={(e) => set('amount', +e.target.value)} /></Field>
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
