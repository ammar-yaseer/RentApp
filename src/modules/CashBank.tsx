import { useState } from 'react';
import { Plus, Banknote, Edit2, ArrowRightLeft } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import type { BankAccount, BankTransaction } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum } from '../lib/utils';

const ACCOUNT_TYPES = ['Cash', 'Bank', 'Card Settlement', 'Online Gateway', 'Investor Payable', 'Reserve'];

export default function CashBank() {
  const { db, update } = useStore();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [txnModal, setTxnModal] = useState(false);

  const totalCash = sum(db.bankAccounts.filter((b) => b.type === 'Cash'), (b) => b.currentBalance);
  const totalBank = sum(db.bankAccounts.filter((b) => b.type === 'Bank'), (b) => b.currentBalance);

  return (
    <div>
      <PageHeader title="Cash & Bank" subtitle="Account balances and transactions" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Account</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Cash" value={formatCurrency(totalCash)} icon={<Banknote size={18} />} tone="green" />
        <StatCard label="Bank" value={formatCurrency(totalBank)} icon={<Banknote size={18} />} tone="blue" />
        <StatCard label="Total" value={formatCurrency(totalCash + totalBank)} icon={<Banknote size={18} />} />
        <StatCard label="Accounts" value={db.bankAccounts.length} icon={<Banknote size={18} />} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {db.bankAccounts.map((a) => (
          <Card key={a.id} className="hover:shadow-card-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">{a.type}{a.bankName ? ` · ${a.bankName}` : ''}</p>
              </div>
              <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(a)} />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{formatCurrency(a.currentBalance)}</p>
            <p className="text-xs text-slate-400 mt-1">Opening: {formatCurrency(a.openingBalance)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Transactions" subtitle="All account activity" action={<Button size="sm" icon={<ArrowRightLeft size={14} />} onClick={() => setTxnModal(true)}>Add Transaction</Button>} />
        {db.bankTransactions.length === 0 ? <EmptyState title="No transactions" /> : (
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
              { key: 'account', header: 'Account', render: (t) => db.bankAccounts.find((a) => a.id === t.accountId)?.name ?? '—' },
              { key: 'type', header: 'Type', render: (t) => t.type },
              { key: 'amount', header: 'Amount', align: 'right', render: (t) => <span className={t.type === 'Deposit' ? 'text-green-600' : 'text-red-600'}>{t.type === 'Deposit' ? '+' : '-'}{formatCurrency(t.amount)}</span> },
              { key: 'ref', header: 'Reference', render: (t) => t.reference ?? '—' },
              { key: 'notes', header: 'Notes', render: (t) => t.notes ?? '—' },
            ]}
            rows={[...db.bankTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
            rowKey={(t) => t.id}
          />
        )}
      </Card>

      {(creating || editing) && <AccountForm account={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(a) => {
        if (editing) { update('bankAccounts', (arr) => arr.map((x) => x.id === a.id ? a : x), { action: 'UPDATE', entity: 'BankAccount', entityId: a.id }); toast.success('Account Updated', 'Account updated successfully'); }
        else { const n = { ...a, id: uid('ba'), createdAt: nowISO(), currentBalance: a.openingBalance }; update('bankAccounts', (arr) => [n, ...arr], { action: 'CREATE', entity: 'BankAccount', entityId: n.id }); update('notifications', (arr) => [{ id: uid('nt'), type: 'Cash/Bank', channel: 'Popup', subject: 'Account Created', message: `${n.name} created`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]); toast.success('Account Created', 'New account added successfully'); }
        setCreating(false); setEditing(null);
      }} />}

      {txnModal && <TxnForm onClose={() => setTxnModal(false)} onSave={(t) => {
        const n = { ...t, id: uid('bt'), createdAt: nowISO() };
        update('bankTransactions', (arr) => [n, ...arr], { action: 'CREATE', entity: 'BankTransaction', entityId: n.id });
        update('bankAccounts', (arr) => arr.map((a) => a.id === t.accountId ? { ...a, currentBalance: a.currentBalance + (t.type === 'Deposit' ? t.amount : -t.amount) } : a));
        update('notifications', (arr) => [{ id: uid('nt'), type: 'Cash/Bank', channel: 'Popup', subject: 'Transaction Added', message: `${t.type} of ${t.amount}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
        toast.success('Transaction Added', 'Bank transaction recorded successfully');
        setTxnModal(false);
      }} />}
    </div>
  );
}

function AccountForm({ account, onClose, onSave }: { account: BankAccount | null; onClose: () => void; onSave: (a: BankAccount) => void }) {
  const [form, setForm] = useState<Partial<BankAccount>>(account ?? { type: 'Bank', openingBalance: 0, currentBalance: 0 });
  const set = (k: keyof BankAccount, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={account ? 'Edit Account' : 'Add Account'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as BankAccount)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Account Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Type" required><Select value={form.type ?? 'Bank'} onChange={(e) => set('type', e.target.value)}>{ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Bank Name"><Input value={form.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} /></Field>
        <Field label="Account Number"><Input value={form.accountNumber ?? ''} onChange={(e) => set('accountNumber', e.target.value)} /></Field>
        <Field label="Opening Balance"><Input type="number" value={form.openingBalance ?? ''} onChange={(e) => set('openingBalance', +e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function TxnForm({ onClose, onSave }: { onClose: () => void; onSave: (t: Omit<BankTransaction, 'id' | 'createdAt'>) => void }) {
  const { db } = useStore();
  const [form, setForm] = useState<Partial<BankTransaction>>({ type: 'Deposit', amount: 0, date: nowISO() });
  const set = (k: keyof BankTransaction, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title="Add Transaction"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as any)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Account" required><Select value={form.accountId ?? ''} onChange={(e) => set('accountId', e.target.value)}><option value="">—</option>{db.bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        <Field label="Type" required><Select value={form.type ?? 'Deposit'} onChange={(e) => set('type', e.target.value)}><option>Deposit</option><option>Withdrawal</option><option>Transfer</option></Select></Field>
        <Field label="Amount" required><Input type="number" value={form.amount ?? ''} onChange={(e) => set('amount', +e.target.value)} /></Field>
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Reference"><Input value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} /></Field>
        <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
