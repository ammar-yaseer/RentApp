import { useState } from 'react';
import { TrendingUp, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../data/store';
import type { ProfitAllocation } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatCurrency, monthKey, sum, cn } from '../lib/utils';

export default function Profit() {
  const { db, update } = useStore();
  const [period, setPeriod] = useState(monthKey());
  const [calcModal, setCalcModal] = useState(false);

  // Calculate distributable profit for selected period
  const [startYear, startMonth] = period.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, 1).toISOString();
  const end = new Date(startYear, startMonth, 1).toISOString();
  const revenue = sum(db.payments.filter((p) => p.date >= start && p.date < end && p.status === 'Paid' && !p.isDeposit), (p) => p.amount);
  const expenses = sum(db.expenses.filter((e) => e.date >= start && e.date < end), (e) => e.amount);
  const distributable = revenue - expenses;

  const activeInvestors = db.investors.filter((i) => i.status === 'Active');
  const totalShare = sum(activeInvestors, (i) => i.profitSharePct);
  const allocations = db.profitAllocations.filter((a) => a.period === period);

  return (
    <div>
      <PageHeader title="Profit Distribution" subtitle="Calculate and allocate distributable profit to investors"
        actions={
          <>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="!w-auto" />
            <Button icon={<Calculator size={16} />} onClick={() => setCalcModal(true)}>Run Calculation</Button>
          </>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Revenue (period)" value={formatCurrency(revenue)} icon={<TrendingUp size={18} />} tone="green" />
        <StatCard label="Expenses (period)" value={formatCurrency(expenses)} icon={<TrendingUp size={18} />} tone="red" />
        <StatCard label="Distributable Profit" value={formatCurrency(distributable)} icon={<TrendingUp size={18} />} tone="blue" />
        <StatCard label="Active Investors" value={activeInvestors.length} icon={<TrendingUp size={18} />} />
      </div>

      {Math.abs(totalShare - 100) > 0.01 && activeInvestors.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Profit share totals {totalShare}% (should be 100%)</p>
            <p className="text-xs mt-1">Adjust profit-sharing percentages in the Investors module so they sum to 100% across active investors.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader title={`Allocations — ${period}`} subtitle="Profit shares for the selected period" />
        {allocations.length === 0 ? (
          <EmptyState icon={<TrendingUp size={40} />} title="No allocations for this period" subtitle="Run a calculation to generate draft allocations" action={<Button icon={<Calculator size={16} />} onClick={() => setCalcModal(true)}>Run Calculation</Button>} />
        ) : (
          <DataTable
            columns={[
              { key: 'investor', header: 'Investor', render: (a) => db.investors.find((i) => i.id === a.investorId)?.fullName ?? '—' },
              { key: 'share', header: 'Share %', align: 'right', render: (a) => `${a.sharePct}%` },
              { key: 'distributable', header: 'Distributable', align: 'right', render: (a) => formatCurrency(a.distributableProfit) },
              { key: 'allocated', header: 'Allocated', align: 'right', render: (a) => <span className="font-semibold">{formatCurrency(a.allocatedAmount)}</span> },
              { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
              { key: 'actions', header: '', align: 'right', render: (a) => a.status === 'Draft' ? (
                <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={() => update('profitAllocations', (arr) => arr.map((x) => x.id === a.id ? { ...x, status: 'Approved' } : x), { action: 'UPDATE', entity: 'ProfitAllocation', entityId: a.id, after: 'status=Approved' })}>Approve</Button>
              ) : null },
            ]}
            rows={allocations}
            rowKey={(a) => a.id}
          />
        )}
      </Card>

      {calcModal && (
        <Modal open onClose={() => setCalcModal(false)} title="Run Profit Calculation" subtitle={`Period: ${period}`}
          footer={<><Button variant="secondary" onClick={() => setCalcModal(false)}>Cancel</Button><Button onClick={() => {
            // remove existing drafts for this period
            update('profitAllocations', (arr) => arr.filter((a) => !(a.period === period && a.status === 'Draft')));
            // create new drafts
            const newAllocs: ProfitAllocation[] = activeInvestors.map((inv) => ({
              id: uid('pa'), period, investorId: inv.id,
              distributableProfit: distributable,
              sharePct: inv.profitSharePct,
              allocatedAmount: distributable * (inv.profitSharePct / 100),
              status: 'Draft', date: nowISO(), createdAt: nowISO(),
            }));
            update('profitAllocations', (arr) => [...newAllocs, ...arr], { action: 'CREATE', entity: 'ProfitAllocation' });
            setCalcModal(false);
          }}>Generate Draft Allocations</Button></>}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Revenue</span><span className="font-semibold text-green-600">{formatCurrency(revenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Expenses</span><span className="font-semibold text-red-600">{formatCurrency(expenses)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-semibold">Distributable Profit</span><span className="font-bold">{formatCurrency(distributable)}</span></div>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-slate-500 mb-2">Will create draft allocations for {activeInvestors.length} investors:</p>
              {activeInvestors.map((inv) => (
                <div key={inv.id} className="flex justify-between py-1">
                  <span>{inv.fullName} ({inv.profitSharePct}%)</span>
                  <span className="font-medium">{formatCurrency(distributable * (inv.profitSharePct / 100))}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
