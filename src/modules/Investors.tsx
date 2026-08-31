import { useState } from 'react';
import { Plus, Users2, Edit2, Trash2, TrendingUp, AlertTriangle, Power } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import type { Investor, InvestorTransaction, InvestorTxnType } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum, cn } from '../lib/utils';

const TXN_TYPES: InvestorTxnType[] = ['Initial Capital', 'Additional Capital', 'Capital Return', 'Profit Allocation', 'Profit Paid', 'Loss Allocation', 'Drawings', 'Adjustment'];

export default function Investors() {
  const { db, update } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Investor | null>(null);
  const [viewing, setViewing] = useState<Investor | null>(null);
  const [txnModal, setTxnModal] = useState<Investor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const active = db.investors.filter((i) => i.status === 'Active');
  const totalCapital = sum(active, (i) => i.capitalBalance);
  const totalOwnership = sum(active, (i) => i.ownershipPct);
  const ownershipValid = Math.abs(totalOwnership - 100) < 0.01;

  const filtered = db.investors.filter((i) => {
    const q = search.toLowerCase();
    return !q || `${i.fullName} ${i.email ?? ''} ${i.phone ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader title="Investors / Shareholders" subtitle={`${db.investors.length} investors (dynamic — unlimited)`} actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Investor</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Active Investors" value={active.length} icon={<Users2 size={18} />} tone="indigo" />
        <StatCard label="Total Capital" value={formatCurrency(totalCapital)} icon={<TrendingUp size={18} />} tone="green" />
        <StatCard label="Total Ownership" value={`${totalOwnership}%`} icon={<Users2 size={18} />} tone={ownershipValid ? 'green' : 'red'} />
        <StatCard label="Avg Ownership" value={`${active.length ? (totalOwnership / active.length).toFixed(1) : 0}%`} icon={<Users2 size={18} />} />
      </div>

      {!ownershipValid && active.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Ownership totals must equal 100%</p>
            <p className="text-xs mt-1">Current total: {totalOwnership}%. Adjust ownership percentages so active investors sum to 100% before activating the partnership configuration.</p>
          </div>
        </div>
      )}

      <div className="mb-4"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search investors…" className="max-w-sm" /></div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<Users2 size={40} />} title="No investors found" subtitle="Add your first investor — there's no limit on the number" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Investor</Button>} /></Card>
      ) : (
        <Card padded={false}>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (i) => <button className="font-medium text-brand-600 hover:underline" onClick={() => setViewing(i)}>{i.fullName}</button> },
              { key: 'joined', header: 'Joined', render: (i) => formatDate(i.joinDate) },
              { key: 'capital', header: 'Capital', align: 'right', render: (i) => formatCurrency(i.capitalBalance) },
              { key: 'ownership', header: 'Ownership', align: 'right', render: (i) => `${i.ownershipPct}%` },
              { key: 'profit', header: 'Profit Share', align: 'right', render: (i) => `${i.profitSharePct}%` },
              { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
              { key: 'actions', header: '', align: 'right', render: (i) => (
                <div className="flex gap-1 justify-end">
                  <IconButton icon={<TrendingUp size={14} />} label="Add transaction" onClick={() => setTxnModal(i)} />
                  <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(i)} />
                  {i.status === 'Active' ? (
                    <IconButton icon={<Power size={14} />} label="Deactivate" onClick={() => { update('investors', (arr) => arr.map((x) => x.id === i.id ? { ...x, status: 'Inactive', updatedAt: nowISO() } : x), { action: 'UPDATE', entity: 'Investor', entityId: i.id, after: 'status=Inactive' }); toast.success('Investor Deactivated', `${i.fullName} deactivated`); }} />
                  ) : (
                    <IconButton icon={<Power size={14} />} label="Activate" onClick={() => { update('investors', (arr) => arr.map((x) => x.id === i.id ? { ...x, status: 'Active', updatedAt: nowISO() } : x), { action: 'UPDATE', entity: 'Investor', entityId: i.id, after: 'status=Active' }); toast.success('Investor Activated', `${i.fullName} activated`); }} />
                  )}
                  <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(i.id)} />
                </div>
              ) },
            ]}
            rows={filtered}
            rowKey={(i) => i.id}
          />
        </Card>
      )}

      {(creating || editing) && <InvestorForm investor={editing} allInvestors={db.investors} onClose={() => { setCreating(false); setEditing(null); }} onSave={(inv) => {
        if (editing) { update('investors', (arr) => arr.map((x) => x.id === inv.id ? { ...inv, updatedAt: nowISO() } : x), { action: 'UPDATE', entity: 'Investor', entityId: inv.id }); toast.success('Investor Updated', 'Investor updated successfully'); }
        else {
          const n: Investor = { ...inv, id: uid('inv'), createdAt: nowISO(), updatedAt: nowISO() };
          update('investors', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Investor', entityId: n.id });
          update('notifications', (arr) => [{ id: uid('nt'), type: 'Investor', channel: 'Popup', subject: 'Investor Created', message: `${n.fullName} added`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
          // create initial capital transaction
          if (inv.investmentAmount > 0) {
            const t: InvestorTransaction = { id: uid('it'), investorId: n.id, type: 'Initial Capital', amount: inv.investmentAmount, date: inv.joinDate, notes: 'Opening capital', createdAt: nowISO() };
            update('investorTransactions', (arr) => [t, ...arr]);
          }
          toast.success('Investor Created', `${n.fullName} added successfully`);
        }
        setCreating(false); setEditing(null);
      }} />}

      {viewing && <InvestorDetail investor={viewing} onClose={() => setViewing(null)} onAddTxn={() => { setTxnModal(viewing); setViewing(null); }} />}

      {txnModal && <TxnForm investor={txnModal} onClose={() => setTxnModal(null)} onSave={(t) => {
        const n: InvestorTransaction = { ...t, id: uid('it'), investorId: txnModal.id, createdAt: nowISO() };
        update('investorTransactions', (arr) => [n, ...arr], { action: 'CREATE', entity: 'InvestorTransaction', entityId: n.id });
        // update capital balance
        const delta = ['Initial Capital', 'Additional Capital', 'Profit Allocation'].includes(t.type) ? t.amount
          : ['Capital Return', 'Profit Paid', 'Loss Allocation', 'Drawings'].includes(t.type) ? -t.amount
          : t.amount;
        update('investors', (arr) => arr.map((i) => i.id === txnModal.id ? { ...i, capitalBalance: i.capitalBalance + delta, updatedAt: nowISO() } : i));
        toast.success('Transaction Added', 'Investor transaction recorded successfully');
        setTxnModal(null);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => {
        if (deleteId) {
          const hasTxns = db.investorTransactions.some((t) => t.investorId === deleteId);
          if (hasTxns) {
            alert('Cannot delete: this investor has financial transactions. Deactivate instead to preserve history.');
            return;
          }
          update('investors', (arr) => arr.filter((i) => i.id !== deleteId), { action: 'DELETE', entity: 'Investor', entityId: deleteId });
          toast.success('Investor Deleted', 'Investor removed');
        }
      }} title="Delete investor?" message="Hard delete is only allowed for investors with zero transactions. Otherwise, deactivate to preserve history." confirmLabel="Delete" danger />
    </div>
  );
}

function InvestorDetail({ investor, onClose, onAddTxn }: { investor: Investor; onClose: () => void; onAddTxn: () => void }) {
  const { db } = useStore();
  const txns = db.investorTransactions.filter((t) => t.investorId === investor.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Modal open onClose={onClose} title={investor.fullName} subtitle={`Investor since ${formatDate(investor.joinDate)}`} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button icon={<TrendingUp size={16} />} onClick={onAddTxn}>Add Transaction</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Card className="card-pad"><p className="text-xs text-slate-500">Capital Balance</p><p className="text-xl font-bold text-slate-900">{formatCurrency(investor.capitalBalance)}</p></Card>
        <Card className="card-pad"><p className="text-xs text-slate-500">Ownership / Profit Share</p><p className="text-xl font-bold text-slate-900">{investor.ownershipPct}% / {investor.profitSharePct}%</p></Card>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
        <div><p className="text-slate-500">Phone</p><p>{investor.phone ?? '—'}</p></div>
        <div><p className="text-slate-500">Email</p><p>{investor.email ?? '—'}</p></div>
        <div><p className="text-slate-500">NIC / Reg</p><p>{investor.nic ?? '—'}</p></div>
        <div><p className="text-slate-500">Bank Details</p><p>{investor.bankDetails ?? '—'}</p></div>
      </div>
      <h4 className="font-semibold text-slate-900 mb-2">Transaction Ledger</h4>
      {txns.length === 0 ? <EmptyState title="No transactions" /> : (
        <DataTable
          columns={[
            { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
            { key: 'type', header: 'Type', render: (t) => <StatusBadge status={t.type} /> },
            { key: 'amount', header: 'Amount', align: 'right', render: (t) => <span className={cn(['Capital Return', 'Profit Paid', 'Loss Allocation', 'Drawings'].includes(t.type) && 'text-red-600')}>{formatCurrency(t.amount)}</span> },
            { key: 'notes', header: 'Notes', render: (t) => t.notes ?? '—' },
          ]}
          rows={txns}
          rowKey={(t) => t.id}
        />
      )}
    </Modal>
  );
}

function InvestorForm({ investor, allInvestors, onClose, onSave }: { investor: Investor | null; allInvestors: Investor[]; onClose: () => void; onSave: (i: Investor) => void }) {
  const [form, setForm] = useState<Partial<Investor>>(investor ?? { status: 'Active', joinDate: nowISO(), investmentAmount: 0, ownershipPct: 0, profitSharePct: 0, capitalBalance: 0 });
  const set = (k: keyof Investor, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-calculate ownership % based on this investor's investment amount vs total of all active investors.
  // Example: investor A puts 700, investor B puts 300 → A gets 70%, B gets 30%.
  const autoCalcOwnership = () => {
    const thisAmount = form.investmentAmount ?? 0;
    if (thisAmount <= 0) { alert('Enter an investment amount first.'); return; }
    const others = allInvestors.filter((i) => i.id !== investor?.id && i.status === 'Active');
    const totalOthers = others.reduce((sum, i) => sum + i.investmentAmount, 0);
    const total = totalOthers + thisAmount;
    if (total <= 0) return;
    const pct = +((thisAmount / total) * 100).toFixed(2);
    set('ownershipPct', pct);
    set('profitSharePct', pct); // default profit share = ownership
  };

  // Sync profit share to match ownership (optional convenience)
  const syncProfitToOwnership = () => set('profitSharePct', form.ownershipPct ?? 0);

  return (
    <Modal open onClose={onClose} title={investor ? 'Edit Investor' : 'Add Investor'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ ...form, capitalBalance: investor ? form.capitalBalance : form.investmentAmount } as Investor)}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Full Name" required><Input value={form.fullName ?? ''} onChange={(e) => set('fullName', e.target.value)} /></Field>
        <Field label="NIC / Passport / Company Reg."><Input value={form.nic ?? ''} onChange={(e) => set('nic', e.target.value)} /></Field>
        <Field label="Phone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Join Date" required><Input type="date" value={form.joinDate ? form.joinDate.slice(0, 10) : ''} onChange={(e) => set('joinDate', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Initial Investment Amount" hint={investor ? 'Edit via transactions only' : 'Enter amount, then click Auto-Calc %'}><Input type="number" value={form.investmentAmount ?? ''} onChange={(e) => set('investmentAmount', +e.target.value)} disabled={!!investor} /></Field>
        <Field label="Ownership %" hint="Auto-calculated from investment proportion">
          <div className="flex gap-2">
            <Input type="number" step="0.01" value={form.ownershipPct ?? ''} onChange={(e) => set('ownershipPct', +e.target.value)} />
            <Button type="button" variant="secondary" size="sm" onClick={autoCalcOwnership} className="shrink-0 whitespace-nowrap">Auto-Calc %</Button>
          </div>
        </Field>
        <Field label="Profit Sharing %" hint="Defaults to ownership %">
          <div className="flex gap-2">
            <Input type="number" step="0.01" value={form.profitSharePct ?? ''} onChange={(e) => set('profitSharePct', +e.target.value)} />
            <Button type="button" variant="secondary" size="sm" onClick={syncProfitToOwnership} className="shrink-0 whitespace-nowrap">Sync = Ownership</Button>
          </div>
        </Field>
        <Field label="Status"><Select value={form.status ?? 'Active'} onChange={(e) => set('status', e.target.value as any)}><option>Active</option><option>Inactive</option></Select></Field>
        <Field label="Bank / Payment Details"><Input value={form.bankDetails ?? ''} onChange={(e) => set('bankDetails', e.target.value)} /></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>

      {/* Live preview of ownership distribution */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-2">Ownership Distribution Preview</p>
        <div className="space-y-1 text-xs">
          {allInvestors.filter((i) => i.id !== investor?.id && i.status === 'Active').map((i) => (
            <div key={i.id} className="flex justify-between"><span>{i.fullName}</span><span>{i.ownershipPct}% · {formatCurrency(i.investmentAmount)}</span></div>
          ))}
          <div className="flex justify-between font-semibold text-brand-700 border-t border-slate-200 pt-1">
            <span>{form.fullName || 'New Investor'}</span>
            <span>{form.ownershipPct ?? 0}% · {formatCurrency(form.investmentAmount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-slate-500 border-t border-slate-200 pt-1 mt-1">
            <span>Total</span>
            <span>{(allInvestors.filter((i) => i.id !== investor?.id && i.status === 'Active').reduce((s, i) => s + i.ownershipPct, 0) + (form.ownershipPct ?? 0)).toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TxnForm({ investor, onClose, onSave }: { investor: Investor; onClose: () => void; onSave: (t: Omit<InvestorTransaction, 'id' | 'investorId' | 'createdAt'>) => void }) {
  const [form, setForm] = useState<Partial<InvestorTransaction>>({ type: 'Additional Capital', amount: 0, date: nowISO() });
  const set = (k: keyof InvestorTransaction, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={`Transaction — ${investor.fullName}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as any)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Type" required><Select value={form.type} onChange={(e) => set('type', e.target.value as InvestorTxnType)}>{TXN_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Amount" required><Input type="number" value={form.amount ?? ''} onChange={(e) => set('amount', +e.target.value)} /></Field>
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Reference"><Input value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} /></Field>
        <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
