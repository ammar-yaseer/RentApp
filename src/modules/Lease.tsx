import { useState, useMemo } from 'react';
import { Plus, Banknote, Edit2, Trash2, CheckCircle2, CalendarClock } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { LeaseContract, LeasePayment } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, formatDate, sum, cn } from '../lib/utils';

/**
 * Generate an amortization schedule for a lease contract using the standard
 * loan amortization formula. Returns N LeasePayment rows (one per month).
 *
 * Monthly payment (EMI) = P * r * (1+r)^n / ((1+r)^n - 1)
 * where P = principal (originalAmount - downPayment), r = monthlyRate, n = termMonths
 *
 * If interestRate is missing or 0, uses the user-provided monthlyInstallment
 * and divides it evenly across principal (interest = 0).
 */
function generateAmortizationSchedule(lease: Partial<LeaseContract>): LeasePayment[] {
  const principal = (lease.originalAmount ?? 0) - (lease.downPayment ?? 0);
  const termMonths = lease.termMonths ?? 0;
  const annualRate = lease.interestRate ?? 0;
  const monthlyRate = annualRate / 100 / 12;
  const startDate = lease.startDate ? new Date(lease.startDate) : new Date();

  // Determine the monthly payment amount
  let monthlyPayment: number;
  if (monthlyRate > 0 && termMonths > 0) {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    monthlyPayment = principal * monthlyRate * factor / (factor - 1);
  } else {
    monthlyPayment = lease.monthlyInstallment ?? (termMonths > 0 ? principal / termMonths : 0);
  }

  const payments: LeasePayment[] = [];
  let opening = principal;

  for (let i = 1; i <= termMonths; i++) {
    const interest = monthlyRate > 0 ? opening * monthlyRate : 0;
    const principalPart = Math.min(monthlyPayment - interest, opening);
    const closing = Math.max(opening - principalPart, 0);

    // Due date = startDate + i months (same day of month)
    const due = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());

    payments.push({
      id: uid('lp'),
      leaseId: '', // will be set by caller
      installmentNo: i,
      dueDate: due.toISOString(),
      amount: Math.round(monthlyPayment * 100) / 100,
      openingBalance: Math.round(opening * 100) / 100,
      principal: Math.round(principalPart * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      closingBalance: Math.round(closing * 100) / 100,
      status: 'Pending',
      createdAt: nowISO(),
    });
    opening = closing;
  }

  return payments;
}

export default function Lease() {
  const { db, update } = useStore();
  const toast = useToast();
  const lookups = useLookups();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeaseContract | null>(null);
  const [payModal, setPayModal] = useState<LeasePayment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scheduleLeaseId, setScheduleLeaseId] = useState<string>(db.leaseContracts[0]?.id ?? '');

  const totalOutstanding = sum(db.leaseContracts, (l) => l.outstandingPrincipal);
  const monthlyTotal = sum(db.leaseContracts.filter((l) => l.status === 'Active'), (l) => l.monthlyInstallment);
  const dueNow = sum(db.leasePayments.filter((p) => p.status !== 'Paid'), (p) => p.amount - (p.paidAmount ?? 0));

  // Payments for the currently selected lease contract (amortization schedule view)
  const schedulePayments = useMemo(() => {
    return db.leasePayments
      .filter((p) => p.leaseId === scheduleLeaseId)
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }, [db.leasePayments, scheduleLeaseId]);

  return (
    <div>
      <PageHeader title="Lease Management" subtitle="Bank leasing for vehicles" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Lease</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Outstanding Principal" value={formatCurrency(totalOutstanding)} icon={<Banknote size={18} />} tone="amber" />
        <StatCard label="Monthly Installments" value={formatCurrency(monthlyTotal)} icon={<Banknote size={18} />} />
        <StatCard label="Due Now" value={formatCurrency(dueNow)} icon={<Banknote size={18} />} tone="red" />
      </div>

      <Card className="mb-4">
        <CardHeader title="Lease Contracts" />
        {db.leaseContracts.length === 0 ? <EmptyState icon={<Banknote size={40} />} title="No lease contracts" /> : (
          <DataTable
            columns={[
              { key: 'lease', header: 'Lease #', render: (l) => l.leaseNumber ?? '—' },
              { key: 'lender', header: 'Lender', render: (l) => l.lender ?? '—' },
              { key: 'vehicle', header: 'Vehicle', render: (l) => lookups.vehicleLabel(l.vehicleId) },
              { key: 'installment', header: 'Monthly', align: 'right', render: (l) => formatCurrency(l.monthlyInstallment) },
              { key: 'outstanding', header: 'Outstanding', align: 'right', render: (l) => formatCurrency(l.outstandingPrincipal) },
              { key: 'next', header: 'Next Due', render: (l) => formatDate(l.nextDueDate) },
              { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
              { key: 'actions', header: '', align: 'right', render: (l) => (
                <div className="flex gap-1 justify-end">
                  <IconButton icon={<CalendarClock size={14} />} label="Schedule" onClick={() => setScheduleLeaseId(l.id)} />
                  <IconButton icon={<Edit2 size={14} />} label="Edit" onClick={() => setEditing(l)} />
                  <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteId(l.id)} />
                </div>
              ) },
            ]}
            rows={db.leaseContracts}
            rowKey={(l) => l.id}
          />
        )}
      </Card>

      {/* Amortization Schedule — per contract */}
      <Card>
        <CardHeader
          title="Amortization Schedule"
          subtitle="Dynamic payment schedule per lease contract"
          action={
            <Select value={scheduleLeaseId} onChange={(e) => setScheduleLeaseId(e.target.value)} className="!w-auto !py-1.5">
              {db.leaseContracts.length === 0 && <option value="">No contracts</option>}
              {db.leaseContracts.map((l) => (
                <option key={l.id} value={l.id}>{l.leaseNumber ?? l.id} — {lookups.vehicleLabel(l.vehicleId)}</option>
              ))}
            </Select>
          }
        />
        {db.leaseContracts.length === 0 ? (
          <EmptyState title="No lease contracts" />
        ) : schedulePayments.length === 0 ? (
          <EmptyState title="No schedule generated for this contract" />
        ) : (
          <DataTable
            columns={[
              { key: 'no', header: 'No', align: 'right', render: (p) => p.installmentNo },
              { key: 'due', header: 'Due Date', render: (p) => <span className={p.status === 'Overdue' ? 'text-red-600 font-medium' : ''}>{formatDate(p.dueDate)}</span> },
              { key: 'opening', header: 'Opening Balance', align: 'right', render: (p) => formatCurrency(p.openingBalance ?? 0) },
              { key: 'amount', header: 'Monthly Payment', align: 'right', render: (p) => formatCurrency(p.amount) },
              { key: 'principal', header: 'Principal', align: 'right', render: (p) => formatCurrency(p.principal ?? 0) },
              { key: 'interest', header: 'Interest', align: 'right', render: (p) => <span className="text-amber-600">{formatCurrency(p.interest ?? 0)}</span> },
              { key: 'closing', header: 'Closing Balance', align: 'right', render: (p) => formatCurrency(p.closingBalance ?? 0) },
              { key: 'paid', header: 'Paid', align: 'center', render: (p) => (
                <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold', p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400')}>
                  {p.status === 'Paid' ? 'Y' : 'N'}
                </span>
              ) },
              { key: 'actions', header: '', align: 'right', render: (p) => p.status !== 'Paid' ? <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={() => setPayModal(p)}>Pay</Button> : null },
            ]}
            rows={schedulePayments}
            rowKey={(p) => p.id}
          />
        )}
      </Card>

      {(creating || editing) && <LeaseForm lease={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={(l, schedule) => {
        if (editing) {
          update('leaseContracts', (arr) => arr.map((x) => x.id === l.id ? l : x), { action: 'UPDATE', entity: 'LeaseContract', entityId: l.id });
          toast.success('Lease Updated', 'Lease contract updated successfully');
        } else {
          const n = { ...l, id: uid('ls'), createdAt: nowISO() } as LeaseContract;
          update('leaseContracts', (arr) => [n, ...arr], { action: 'CREATE', entity: 'LeaseContract', entityId: n.id });
          // Generate and store the amortization schedule
          const payments = (schedule ?? []).map((p) => ({ ...p, leaseId: n.id }));
          if (payments.length > 0) {
            update('leasePayments', (arr) => [...payments, ...arr], { action: 'CREATE', entity: 'LeasePayment', entityId: n.id });
          }
          update('notifications', (arr) => [{ id: uid('nt'), type: 'Lease', channel: 'Popup', subject: 'Lease Contract Created', message: `Lease ${n.leaseNumber ?? n.id} created with ${payments.length} scheduled payments`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
          toast.success('Lease Created', `New lease contract added with ${payments.length}-month amortization schedule`);
          setScheduleLeaseId(n.id);
        }
        setCreating(false); setEditing(null);
      }} />}

      {payModal && <PayForm payment={payModal} onClose={() => setPayModal(null)} onSave={(p) => {
        update('leasePayments', (arr) => arr.map((x) => x.id === p.id ? p : x), { action: 'UPDATE', entity: 'LeasePayment', entityId: p.id });
        if (p.status === 'Paid') {
          update('leaseContracts', (arr) => arr.map((l) => l.id === p.leaseId ? { ...l, outstandingPrincipal: Math.max(l.outstandingPrincipal - (p.principal ?? p.amount), 0) } : l));
        }
        toast.success('Payment Recorded', 'Lease payment recorded successfully');
        setPayModal(null);
      }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => {
        if (deleteId) {
          update('leaseContracts', (arr) => arr.filter((l) => l.id !== deleteId), { action: 'DELETE', entity: 'LeaseContract', entityId: deleteId });
          // Also remove the schedule payments for this contract
          update('leasePayments', (arr) => arr.filter((p) => p.leaseId !== deleteId));
          toast.success('Lease Deleted', 'Lease contract and its schedule removed');
          // Reset selected schedule if it was the deleted one
          if (scheduleLeaseId === deleteId) setScheduleLeaseId(db.leaseContracts.find((l) => l.id !== deleteId)?.id ?? '');
        }
      }} title="Delete lease?" message="Remove this lease contract and its full amortization schedule?" confirmLabel="Delete" danger />
    </div>
  );
}

function LeaseForm({ lease, onClose, onSave }: { lease: LeaseContract | null; onClose: () => void; onSave: (l: LeaseContract, schedule?: LeasePayment[]) => void }) {
  const { db } = useStore();
  const [form, setForm] = useState<Partial<LeaseContract>>(lease ?? { status: 'Active', startDate: nowISO(), originalAmount: 0, monthlyInstallment: 0, outstandingPrincipal: 0, interestRate: 0, termMonths: 0, downPayment: 0 });
  const set = (k: keyof LeaseContract, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Live preview of the amortization schedule based on current form values
  const previewSchedule = useMemo(() => {
    if (!form.originalAmount || !form.termMonths) return [];
    return generateAmortizationSchedule(form);
  }, [form.originalAmount, form.downPayment, form.interestRate, form.termMonths, form.monthlyInstallment, form.startDate]);

  const previewMonthly = previewSchedule[0]?.amount ?? form.monthlyInstallment ?? 0;

  const handleSave = () => {
    const schedule = lease ? undefined : generateAmortizationSchedule(form);
    // Auto-fill monthlyInstallment and outstandingPrincipal from the schedule if not set
    const toSave = {
      ...form,
      monthlyInstallment: form.monthlyInstallment || previewMonthly,
      outstandingPrincipal: form.outstandingPrincipal || ((form.originalAmount ?? 0) - (form.downPayment ?? 0)),
      nextDueDate: schedule?.[0]?.dueDate ?? form.nextDueDate,
    } as LeaseContract;
    onSave(toSave, schedule);
  };

  return (
    <Modal open onClose={onClose} title={lease ? 'Edit Lease' : 'Add Lease'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>Save</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Vehicle" required><Select value={form.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)}><option value="">—</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNumber} — {v.make} {v.model}</option>)}</Select></Field>
        <Field label="Lender / Bank"><Input value={form.lender ?? ''} onChange={(e) => set('lender', e.target.value)} /></Field>
        <Field label="Lease Number"><Input value={form.leaseNumber ?? ''} onChange={(e) => set('leaseNumber', e.target.value)} /></Field>
        <Field label="Original Amount" required><Input type="number" value={form.originalAmount ?? ''} onChange={(e) => set('originalAmount', +e.target.value)} /></Field>
        <Field label="Down Payment"><Input type="number" value={form.downPayment ?? ''} onChange={(e) => set('downPayment', +e.target.value)} /></Field>
        <Field label="Interest Rate (%)" hint="Annual rate; used to compute the schedule"><Input type="number" value={form.interestRate ?? ''} onChange={(e) => set('interestRate', +e.target.value)} placeholder="e.g. 12" /></Field>
        <Field label="Term (months)" required hint="Number of installments to generate"><Input type="number" value={form.termMonths ?? ''} onChange={(e) => set('termMonths', +e.target.value)} placeholder="e.g. 48" /></Field>
        <Field label="Monthly Installment" hint="Leave 0 to auto-calculate from rate & term"><Input type="number" value={form.monthlyInstallment ?? ''} onChange={(e) => set('monthlyInstallment', +e.target.value)} /></Field>
        <Field label="Start Date" required hint="First installment due one month after this"><Input type="date" value={form.startDate ? form.startDate.slice(0, 10) : ''} onChange={(e) => set('startDate', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="End Date"><Input type="date" value={form.endDate ? form.endDate.slice(0, 10) : ''} onChange={(e) => set('endDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        <Field label="Outstanding Principal" hint="Auto-set to (Original − Down Payment) if 0"><Input type="number" value={form.outstandingPrincipal ?? ''} onChange={(e) => set('outstandingPrincipal', +e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status ?? 'Active'} onChange={(e) => set('status', e.target.value as any)}><option>Active</option><option>Completed</option><option>Defaulted</option></Select></Field>
      </div>

      {/* Live amortization preview */}
      {!lease && previewSchedule.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700">Amortization Preview ({previewSchedule.length} installments)</p>
            <span className="text-xs text-slate-500">Monthly: <strong className="text-slate-900">{formatCurrency(previewMonthly)}</strong></span>
          </div>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Due</th>
                  <th className="py-1 pr-2 text-right">Opening</th>
                  <th className="py-1 pr-2 text-right">Principal</th>
                  <th className="py-1 pr-2 text-right">Interest</th>
                  <th className="py-1 text-right">Closing</th>
                </tr>
              </thead>
              <tbody>
                {previewSchedule.slice(0, 12).map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-1 pr-2 text-slate-600">{p.installmentNo}</td>
                    <td className="py-1 pr-2 text-slate-600">{formatDate(p.dueDate)}</td>
                    <td className="py-1 pr-2 text-right text-slate-600">{formatCurrency(p.openingBalance ?? 0)}</td>
                    <td className="py-1 pr-2 text-right text-slate-700">{formatCurrency(p.principal ?? 0)}</td>
                    <td className="py-1 pr-2 text-right text-amber-600">{formatCurrency(p.interest ?? 0)}</td>
                    <td className="py-1 text-right text-slate-600">{formatCurrency(p.closingBalance ?? 0)}</td>
                  </tr>
                ))}
                {previewSchedule.length > 12 && (
                  <tr><td colSpan={6} className="py-1 text-center text-slate-400">… {previewSchedule.length - 12} more installments</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">This schedule will be saved when you create the lease. You can record payments against each installment afterward.</p>
        </div>
      )}
    </Modal>
  );
}

function PayForm({ payment, onClose, onSave }: { payment: LeasePayment; onClose: () => void; onSave: (p: LeasePayment) => void }) {
  const [form, setForm] = useState<LeasePayment>(payment);
  const set = (k: keyof LeasePayment, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={`Record Payment — Installment #${payment.installmentNo}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ ...form, status: 'Paid', paidAmount: form.paidAmount ?? form.amount })}>Save Payment</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Due Date</p><p className="font-semibold text-slate-900">{formatDate(form.dueDate)}</p></div>
          <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Opening Balance</p><p className="font-semibold text-slate-900">{formatCurrency(form.openingBalance ?? 0)}</p></div>
          <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Principal</p><p className="font-semibold text-slate-700">{formatCurrency(form.principal ?? 0)}</p></div>
          <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Interest</p><p className="font-semibold text-amber-600">{formatCurrency(form.interest ?? 0)}</p></div>
        </div>
        <Field label="Due Amount"><Input value={form.amount} disabled /></Field>
        <Field label="Paid Amount" required><Input type="number" value={form.paidAmount ?? ''} onChange={(e) => set('paidAmount', +e.target.value)} /></Field>
        <Field label="Paid Date" required><Input type="date" value={form.paidDate ? form.paidDate.slice(0, 10) : ''} onChange={(e) => set('paidDate', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
        <Field label="Bank Reference"><Input value={form.bankReference ?? ''} onChange={(e) => set('bankReference', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
