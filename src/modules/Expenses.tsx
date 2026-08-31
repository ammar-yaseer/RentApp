import { useState } from 'react';
import { Plus, FileText, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { Expense, ExpenseCategory } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { VendorSelect } from '../components/ui/VendorSelect';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Tabs, SearchInput } from '../components/ui/Tabs';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum, monthKey } from '../lib/utils';

const CATEGORIES: ExpenseCategory[] = ['Leasing', 'Insurance', 'Fuel', 'Maintenance', 'Repair', 'Cleaning', 'Marketing', 'Bank Fees', 'Salaries', 'Utilities', 'Parking', 'Tolls', 'Office', 'Taxes', 'Driver Allowance', 'Other'];
const METHODS = ['Cash', 'Card', 'Bank Transfer', 'Online Gateway', 'Cheque', 'Other'];

export default function Expenses() {
  const { db, update, nextSeq } = useStore();
  const toast = useToast();
  const lookups = useLookups();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const thisMonth = monthKey();
  const filtered = db.expenses
    .filter((e) => tab === 'all' || e.category === tab)
    .filter((e) => {
      const q = search.toLowerCase();
      return !q || `${e.number} ${e.category} ${e.notes ?? ''}`.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalMonth = sum(db.expenses.filter((e) => monthKey(new Date(e.date)) === thisMonth), (e) => e.amount);
  const pending = db.expenses.filter((e) => e.approvalStatus === 'Pending').length;

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Business expenses by category" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Expense</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="This Month" value={formatCurrency(totalMonth)} tone="red" />
        <StatCard label="Total Records" value={db.expenses.length} />
        <StatCard label="Pending Approval" value={pending} tone="amber" />
      </div>

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search expenses…" className="max-w-sm" /></div>
      <Tabs tabs={[
        { key: 'all', label: 'All', count: db.expenses.length },
        ...CATEGORIES.filter((c) => db.expenses.some((e) => e.category === c)).slice(0, 6).map((c) => ({ key: c, label: c, count: db.expenses.filter((e) => e.category === c).length })),
      ]} active={tab} onChange={setTab} />

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card><EmptyState icon={<FileText size={40} />} title="No expenses found" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Expense</Button>} /></Card>
        ) : (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'number', header: 'Expense #', render: (e) => <span className="font-medium">{e.number}</span> },
                { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
                { key: 'category', header: 'Category', render: (e) => <StatusBadge status={e.category} /> },
                { key: 'vehicle', header: 'Vehicle', render: (e) => e.vehicleId ? lookups.vehicleLabel(e.vehicleId) : '—' },
                { key: 'amount', header: 'Amount', align: 'right', render: (e) => formatCurrency(e.amount) },
                { key: 'method', header: 'Method', render: (e) => e.method ?? '—' },
                { key: 'approval', header: 'Approval', render: (e) => e.approvalStatus ? <StatusBadge status={e.approvalStatus} /> : '—' },
                { key: 'actions', header: '', align: 'right', render: (e) => (
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(e)} />
                    <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(e.id)} />
                  </div>
                ) },
              ]}
              rows={filtered}
              rowKey={(e) => e.id}
            />
          </Card>
        )}
      </div>

      {(creating || editing) && <ExpenseForm expense={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(e) => {
        if (editing) { update('expenses', (arr) => arr.map((x) => x.id === e.id ? e : x), { action: 'UPDATE', entity: 'Expense', entityId: e.id }); toast.success('Expense Updated', `${formatCurrency(e.amount)} — ${e.category}`); }
        else { const number = nextSeq('expense'); const n = { ...e, id: uid('ex'), number, createdAt: nowISO() }; update('expenses', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Expense', entityId: n.id }); update('notifications', (arr) => [{ id: uid('nt'), type: 'Expense', channel: 'Popup', subject: 'Expense Recorded', message: `${formatCurrency(e.amount)} — ${e.category}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]); toast.success('Expense Recorded', `${formatCurrency(e.amount)} — ${e.category}`); }
        setCreating(false); setEditing(null);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { update('expenses', (arr) => arr.filter((e) => e.id !== deleteId), { action: 'DELETE', entity: 'Expense', entityId: deleteId }); toast.success('Expense Deleted'); } }} title="Delete expense?" message="Remove this expense?" confirmLabel="Delete" danger />
    </div>
  );
}

function ExpenseForm({ expense, onClose, onSave }: { expense: Expense | null; onClose: () => void; onSave: (e: Expense) => void }) {
  const { db } = useStore();
  const lookups = useLookups();
  const [form, setForm] = useState<Partial<Expense>>(expense ?? { date: nowISO(), category: 'Fuel', amount: 0, method: 'Cash', approvalStatus: 'Approved' });
  const set = (k: keyof Expense, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={expense ? 'Edit Expense' : 'Add Expense'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Expense)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Category" required><Select value={form.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Amount" required><Input type="number" value={form.amount ?? ''} onChange={(e) => set('amount', +e.target.value)} /></Field>
        <Field label="Tax Amount"><Input type="number" value={form.taxAmount ?? ''} onChange={(e) => set('taxAmount', +e.target.value)} /></Field>
        <Field label="Vehicle"><Select value={form.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value || undefined)}><option value="">—</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNumber} — {v.make} {v.model}</option>)}</Select></Field>
        <Field label="Vendor"><VendorSelect value={form.vendorId} onChange={(v) => set('vendorId', v)} /></Field>
        <Field label="Payment Method"><Select value={form.method ?? 'Cash'} onChange={(e) => set('method', e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Paid By"><Input value={form.paidBy ?? ''} onChange={(e) => set('paidBy', e.target.value)} /></Field>
        <Field label="Reference"><Input value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} /></Field>
        <Field label="Approval Status"><Select value={form.approvalStatus ?? 'Approved'} onChange={(e) => set('approvalStatus', e.target.value)}><option>Approved</option><option>Pending</option><option>Rejected</option></Select></Field>
        <Field label="Recurring"><Select value={form.recurring ? 'yes' : 'no'} onChange={(e) => set('recurring', e.target.value === 'yes')}><option value="no">No</option><option value="yes">Yes</option></Select></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
