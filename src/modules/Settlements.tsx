import { useState } from 'react';
import { Plus, Banknote, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import type { Settlement, SettlementStatus } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum } from '../lib/utils';

const STATUSES: SettlementStatus[] = ['Draft', 'Pending Approval', 'Approved', 'Paid', 'Reconciled', 'Cancelled'];

export default function Settlements() {
  const { db, update, nextSeq } = useStore();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Settlement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalPaid = sum(db.settlements.filter((s) => s.status === 'Paid' || s.status === 'Reconciled'), (s) => s.amount);
  const pending = db.settlements.filter((s) => s.status === 'Pending Approval').length;

  return (
    <div>
      <PageHeader title="Settlements" subtitle="Investor profit settlement lifecycle" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>New Settlement</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Total Paid" value={formatCurrency(totalPaid)} icon={<Banknote size={18} />} tone="green" />
        <StatCard label="Pending Approval" value={pending} icon={<Banknote size={18} />} tone="amber" />
        <StatCard label="Total Settlements" value={db.settlements.length} icon={<Banknote size={18} />} />
      </div>

      {db.settlements.length === 0 ? (
        <Card><EmptyState icon={<Banknote size={40} />} title="No settlements" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>New Settlement</Button>} /></Card>
      ) : (
        <Card padded={false}>
          <DataTable
            columns={[
              { key: 'number', header: 'Settlement #', render: (s) => <span className="font-medium">{s.number}</span> },
              { key: 'investor', header: 'Investor', render: (s) => db.investors.find((i) => i.id === s.investorId)?.fullName ?? '—' },
              { key: 'period', header: 'Period', render: (s) => s.period },
              { key: 'amount', header: 'Amount', align: 'right', render: (s) => formatCurrency(s.amount) },
              { key: 'date', header: 'Date', render: (s) => formatDate(s.date) },
              { key: 'paid', header: 'Paid Date', render: (s) => s.paidDate ? formatDate(s.paidDate) : '—' },
              { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
              { key: 'actions', header: '', align: 'right', render: (s) => (
                <div className="flex gap-1 justify-end">
                  {s.status === 'Pending Approval' && <IconButton icon={<CheckCircle2 size={14} />} label="Approve" onClick={() => { update('settlements', (arr) => arr.map((x) => x.id === s.id ? { ...x, status: 'Approved' } : x), { action: 'UPDATE', entity: 'Settlement', entityId: s.id, after: 'status=Approved' }); toast.success('Settlement Approved', `${s.number} approved`); }} />}
                  {s.status === 'Approved' && <IconButton icon={<CheckCircle2 size={14} />} label="Mark Paid" onClick={() => { update('settlements', (arr) => arr.map((x) => x.id === s.id ? { ...x, status: 'Paid', paidDate: nowISO() } : x), { action: 'UPDATE', entity: 'Settlement', entityId: s.id, after: 'status=Paid' }); toast.success('Settlement Paid', `${s.number} marked as paid`); }} />}
                  <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(s)} />
                  <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(s.id)} />
                </div>
              ) },
            ]}
            rows={[...db.settlements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
            rowKey={(s) => s.id}
          />
        </Card>
      )}

      {(creating || editing) && <SettlementForm settlement={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(s) => {
        if (editing) { update('settlements', (arr) => arr.map((x) => x.id === s.id ? s : x), { action: 'UPDATE', entity: 'Settlement', entityId: s.id }); toast.success('Settlement Updated', 'Settlement updated successfully'); }
        else { const number = nextSeq('settlement'); const n = { ...s, id: uid('st'), number, createdAt: nowISO() }; update('settlements', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Settlement', entityId: n.id }); update('notifications', (arr) => [{ id: uid('nt'), type: 'Settlement', channel: 'Popup', subject: 'Settlement Created', message: `${number} created`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]); toast.success('Settlement Created', `${number} created successfully`); }
        setCreating(false); setEditing(null);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { update('settlements', (arr) => arr.filter((s) => s.id !== deleteId), { action: 'DELETE', entity: 'Settlement', entityId: deleteId }); toast.success('Settlement Deleted', 'Settlement removed'); } }} title="Delete settlement?" message="Remove this settlement?" confirmLabel="Delete" danger />
    </div>
  );
}

function SettlementForm({ settlement, onClose, onSave }: { settlement: Settlement | null; onClose: () => void; onSave: (s: Settlement) => void }) {
  const { db } = useStore();
  const [form, setForm] = useState<Partial<Settlement>>(settlement ?? { status: 'Draft', date: nowISO(), amount: 0, period: '' });
  const set = (k: keyof Settlement, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={settlement ? 'Edit Settlement' : 'New Settlement'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Settlement)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Investor" required><Select value={form.investorId ?? ''} onChange={(e) => set('investorId', e.target.value)}><option value="">—</option>{db.investors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}</Select></Field>
        <Field label="Period" required><Input type="month" value={form.period ?? ''} onChange={(e) => set('period', e.target.value)} /></Field>
        <Field label="Amount" required><Input type="number" value={form.amount ?? ''} onChange={(e) => set('amount', +e.target.value)} /></Field>
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Status"><Select value={form.status ?? 'Draft'} onChange={(e) => set('status', e.target.value as SettlementStatus)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Bank Reference"><Input value={form.bankReference ?? ''} onChange={(e) => set('bankReference', e.target.value)} /></Field>
        <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
