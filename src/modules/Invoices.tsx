import { useState } from 'react';
import { Plus, Receipt, Eye, Printer, X } from 'lucide-react';
import { useStore } from '../data/store';
import { useLookups } from '../lib/hooks';
import type { Document, DocumentType } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Tabs, SearchInput } from '../components/ui/Tabs';
import { uid, nowISO, formatCurrency, formatDate, sum } from '../lib/utils';

const TYPES: DocumentType[] = ['Invoice', 'Receipt', 'Tax Invoice', 'Payment Receipt', 'Rental Agreement', 'Deposit Receipt', 'Refund Receipt', 'Damage Charge', 'Corporate Consolidated'];

export default function Invoices() {
  const { db, update, nextSeq } = useStore();
  const lookups = useLookups();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Document | null>(null);

  const filtered = db.documents
    .filter((d) => tab === 'all' || (tab === 'void' ? d.voided : !d.voided))
    .filter((d) => {
      const q = search.toLowerCase();
      return !q || `${d.number} ${lookups.customerLabel(d.customerId)}`.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIssued = sum(db.documents.filter((d) => !d.voided), (d) => d.total);
  const totalOutstanding = sum(db.documents.filter((d) => !d.voided), (d) => d.balance);

  return (
    <div>
      <PageHeader title="Invoices & Receipts" subtitle="All generated documents" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>New Document</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Card className="card-pad"><p className="text-xs text-slate-500">Total Issued</p><p className="text-xl font-bold text-slate-900">{formatCurrency(totalIssued)}</p></Card>
        <Card className="card-pad"><p className="text-xs text-slate-500">Outstanding</p><p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p></Card>
        <Card className="card-pad"><p className="text-xs text-slate-500">Total Documents</p><p className="text-xl font-bold text-slate-900">{db.documents.length}</p></Card>
      </div>

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search documents…" className="max-w-sm" /></div>
      <Tabs tabs={[
        { key: 'all', label: 'All', count: db.documents.length },
        { key: 'active', label: 'Active', count: db.documents.filter((d) => !d.voided).length },
        { key: 'void', label: 'Voided', count: db.documents.filter((d) => d.voided).length },
      ]} active={tab} onChange={setTab} />

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card><EmptyState icon={<Receipt size={40} />} title="No documents found" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>New Document</Button>} /></Card>
        ) : (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'number', header: 'Number', render: (d) => <span className="font-medium">{d.number}</span> },
                { key: 'type', header: 'Type', render: (d) => d.type },
                { key: 'customer', header: 'Customer', render: (d) => lookups.customerLabel(d.customerId) },
                { key: 'date', header: 'Date', render: (d) => formatDate(d.date) },
                { key: 'total', header: 'Total', align: 'right', render: (d) => formatCurrency(d.total) },
                { key: 'balance', header: 'Balance', align: 'right', render: (d) => <span className={d.balance > 0 ? 'text-red-600 font-medium' : ''}>{formatCurrency(d.balance)}</span> },
                { key: 'status', header: 'Status', render: (d) => d.voided ? <StatusBadge status="Cancelled" /> : d.balance > 0 ? <StatusBadge status="Partially Paid" /> : <StatusBadge status="Paid" /> },
                { key: 'actions', header: '', align: 'right', render: (d) => <IconButton icon={<Eye size={14} />} label="View" onClick={() => setViewing(d)} /> },
              ]}
              rows={filtered}
              rowKey={(d) => d.id}
            />
          </Card>
        )}
      </div>

      {creating && <DocForm onClose={() => setCreating(false)} onSave={(d) => {
        const number = nextSeq('invoice');
        const n = { ...d, id: uid('dc'), number, createdAt: nowISO() };
        update('documents', (arr) => [n, ...arr], { action: 'CREATE', entity: 'Document', entityId: n.id });
        setCreating(false);
      }} />}

      {viewing && <DocPreview doc={viewing} onClose={() => setViewing(null)} onVoid={() => {
        update('documents', (arr) => arr.map((d) => d.id === viewing.id ? { ...d, voided: true } : d), { action: 'VOID', entity: 'Document', entityId: viewing.id });
        setViewing(null);
      }} />}
    </div>
  );
}

function DocForm({ onClose, onSave }: { onClose: () => void; onSave: (d: Omit<Document, 'id' | 'number' | 'createdAt'>) => void }) {
  const { db } = useStore();
  const lookups = useLookups();
  const [form, setForm] = useState<Partial<Document>>({ type: 'Invoice', date: nowISO(), subtotal: 0, taxAmount: 0, total: 0, paidAmount: 0, balance: 0 });
  const set = (k: keyof Document, v: any) => setForm((f) => {
    const next = { ...f, [k]: v };
    const total = (next.subtotal ?? 0) + (next.taxAmount ?? 0);
    next.total = total;
    next.balance = total - (next.paidAmount ?? 0);
    return next;
  });

  return (
    <Modal open onClose={onClose} title="New Document"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as any)}>Generate</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Type" required><Select value={form.type} onChange={(e) => set('type', e.target.value as DocumentType)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Date" required><Input type="date" value={form.date ? form.date.slice(0, 10) : ''} onChange={(e) => set('date', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Booking"><Select value={form.bookingId ?? ''} onChange={(e) => {
          const b = db.bookings.find((x) => x.id === e.target.value);
          set('bookingId', e.target.value || undefined);
          if (b) { set('customerId', b.customerId); set('subtotal', b.rentalDays * b.dailyRate); }
        }}><option value="">Standalone</option>{db.bookings.map((b) => <option key={b.id} value={b.id}>{b.number} — {lookups.customerLabel(b.customerId)}</option>)}</Select></Field>
        <Field label="Customer"><Select value={form.customerId ?? ''} onChange={(e) => set('customerId', e.target.value || undefined)}><option value="">—</option>{db.customers.map((c) => <option key={c.id} value={c.id}>{c.type === 'Corporate' ? c.companyName : c.fullName}</option>)}</Select></Field>
        <Field label="Subtotal"><Input type="number" value={form.subtotal ?? ''} onChange={(e) => set('subtotal', +e.target.value)} /></Field>
        <Field label="Tax Amount"><Input type="number" value={form.taxAmount ?? ''} onChange={(e) => set('taxAmount', +e.target.value)} /></Field>
        <Field label="Paid Amount"><Input type="number" value={form.paidAmount ?? ''} onChange={(e) => set('paidAmount', +e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-brand-50 text-sm flex justify-between"><span className="text-brand-700">Total</span><span className="font-semibold text-brand-700">{formatCurrency(form.total ?? 0)}</span></div>
    </Modal>
  );
}

function DocPreview({ doc, onClose, onVoid }: { doc: Document; onClose: () => void; onVoid: () => void }) {
  const { db } = useStore();
  const lookups = useLookups();
  const settings = db.settings;

  return (
    <Modal open onClose={onClose} title={doc.number} subtitle={doc.type} size="lg"
      footer={<><Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>Print</Button>{!doc.voided && <Button variant="danger" icon={<X size={16} />} onClick={onVoid}>Void</Button>}</>}>
      <div className="bg-white border border-slate-200 rounded-lg p-6 print:border-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{settings.businessName}</h2>
            <p className="text-sm text-slate-500">{settings.address}</p>
            <p className="text-sm text-slate-500">Tax Reg: {settings.taxRegNumber}</p>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-bold text-brand-700">{doc.type}</h3>
            <p className="text-sm font-semibold">{doc.number}</p>
            <p className="text-sm text-slate-500">{formatDate(doc.date)}</p>
          </div>
        </div>
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase">Bill To</p>
          <p className="font-semibold text-slate-900">{lookups.customerLabel(doc.customerId)}</p>
        </div>
        <table className="w-full text-sm mb-6">
          <thead><tr className="border-b border-slate-200"><th className="text-left py-2">Description</th><th className="text-right py-2">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-slate-100"><td className="py-2">Subtotal</td><td className="text-right py-2">{formatCurrency(doc.subtotal)}</td></tr>
            {doc.taxAmount > 0 && <tr className="border-b border-slate-100"><td className="py-2">Tax</td><td className="text-right py-2">{formatCurrency(doc.taxAmount)}</td></tr>}
            <tr className="font-bold"><td className="py-2">Total</td><td className="text-right py-2">{formatCurrency(doc.total)}</td></tr>
            <tr><td className="py-2 text-slate-500">Paid</td><td className="text-right py-2">{formatCurrency(doc.paidAmount)}</td></tr>
            <tr className="font-bold text-red-600"><td className="py-2">Balance Due</td><td className="text-right py-2">{formatCurrency(doc.balance)}</td></tr>
          </tbody>
        </table>
        {doc.voided && <div className="text-center text-red-600 font-bold text-3xl rotate-[-10deg] mt-4">VOID</div>}
      </div>
    </Modal>
  );
}
