import { useState } from 'react';
import { BarChart3, Download, Printer, FileText } from 'lucide-react';
import { useStore } from '../data/store';
import { useLookups } from '../lib/hooks';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Form';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatDate, sum, monthKey, downloadFile } from '../lib/utils';

export default function Reports() {
  const { db } = useStore();
  const lookups = useLookups();
  const [period, setPeriod] = useState(monthKey());
  const [reportType, setReportType] = useState('profit-loss');

  const [startYear, startMonth] = period.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, 1).toISOString();
  const end = new Date(startYear, startMonth, 1).toISOString();

  const revenue = sum(db.payments.filter((p) => p.date >= start && p.date < end && p.status === 'Paid' && !p.isDeposit), (p) => p.amount);
  const expenses = sum(db.expenses.filter((e) => e.date >= start && e.date < end), (e) => e.amount);
  const profit = revenue - expenses;

  const periodBookings = db.bookings.filter((b) => b.pickupAt >= start && b.pickupAt < end);
  const periodExpenses = db.expenses.filter((e) => e.date >= start && e.date < end);

  const exportCSV = () => {
    let csv = '';
    if (reportType === 'profit-loss') {
      csv = 'Item,Amount\nRevenue,' + revenue + '\nExpenses,' + expenses + '\nNet Profit,' + profit + '\n';
    } else if (reportType === 'bookings') {
      csv = 'Booking,Customer,Vehicle,Pickup,Return,Total,Status\n';
      periodBookings.forEach((b) => {
        csv += `${b.number},${lookups.customerLabel(b.customerId)},${lookups.vehicleLabel(b.vehicleId)},${formatDate(b.pickupAt)},${formatDate(b.returnAt)},${b.rentalDays * b.dailyRate},${b.status}\n`;
      });
    } else if (reportType === 'expenses') {
      csv = 'Date,Number,Category,Vehicle,Amount,Method\n';
      periodExpenses.forEach((e) => {
        csv += `${formatDate(e.date)},${e.number},${e.category},${e.vehicleId ? lookups.vehicleLabel(e.vehicleId) : ''},${e.amount},${e.method ?? ''}\n`;
      });
    }
    downloadFile(`rentflow-${reportType}-${period}.csv`, csv, 'text/csv');
  };

  const reports = [
    { key: 'profit-loss', label: 'Profit & Loss', desc: 'Revenue, expenses, net profit' },
    { key: 'bookings', label: 'Bookings Report', desc: 'All bookings in period' },
    { key: 'expenses', label: 'Expense Report', desc: 'All expenses in period' },
    { key: 'vehicle-util', label: 'Vehicle Utilization', desc: 'Rental days per vehicle' },
    { key: 'investor', label: 'Investor Statement', desc: 'Capital & profit per investor' },
    { key: 'outstanding', label: 'Outstanding Payments', desc: 'Customer balances' },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Financial and operational reports"
        actions={
          <>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="!w-auto" />
            <Button variant="secondary" icon={<Download size={16} />} onClick={exportCSV}>Export CSV</Button>
            <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>Print</Button>
          </>
        } />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {reports.map((r) => (
          <Card key={r.key} className={reportType === r.key ? 'border-brand-500 ring-1 ring-brand-200' : ''}>
            <button className="text-left w-full" onClick={() => setReportType(r.key)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-50 p-2 text-brand-600"><FileText size={18} /></div>
                <div>
                  <p className="font-semibold text-slate-900">{r.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            </button>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title={reports.find((r) => r.key === reportType)?.label ?? ''} subtitle={`Period: ${period}`} />

        {reportType === 'profit-loss' && (
          <div className="space-y-3">
            <Row label="Revenue" value={formatCurrency(revenue)} />
            <Row label="Expenses" value={formatCurrency(expenses)} />
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg"><span>Net Profit</span><span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(profit)}</span></div>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Expense Breakdown</p>
              {Object.entries(groupByCategory(periodExpenses)).map(([cat, amt]) => (
                <Row key={cat} label={cat} value={formatCurrency(amt)} />
              ))}
            </div>
          </div>
        )}

        {reportType === 'bookings' && (
          <DataTable
            columns={[
              { key: 'number', header: 'Booking', render: (b) => b.number },
              { key: 'customer', header: 'Customer', render: (b) => lookups.customerLabel(b.customerId) },
              { key: 'vehicle', header: 'Vehicle', render: (b) => lookups.vehicleLabel(b.vehicleId) },
              { key: 'pickup', header: 'Pickup', render: (b) => formatDate(b.pickupAt) },
              { key: 'return', header: 'Return', render: (b) => formatDate(b.returnAt) },
              { key: 'total', header: 'Total', align: 'right', render: (b) => formatCurrency(b.rentalDays * b.dailyRate) },
              { key: 'status', header: 'Status', render: (b) => b.status },
            ]}
            rows={periodBookings}
            rowKey={(b) => b.id}
            empty="No bookings in this period"
          />
        )}

        {reportType === 'expenses' && (
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
              { key: 'number', header: 'Expense #', render: (e) => e.number },
              { key: 'category', header: 'Category', render: (e) => e.category },
              { key: 'vehicle', header: 'Vehicle', render: (e) => e.vehicleId ? lookups.vehicleLabel(e.vehicleId) : '—' },
              { key: 'amount', header: 'Amount', align: 'right', render: (e) => formatCurrency(e.amount) },
            ]}
            rows={periodExpenses}
            rowKey={(e) => e.id}
            empty="No expenses in this period"
          />
        )}

        {reportType === 'vehicle-util' && (
          <DataTable
            columns={[
              { key: 'vehicle', header: 'Vehicle', render: (v) => lookups.vehicleLabel(v.id) },
              { key: 'bookings', header: 'Bookings', align: 'right', render: (v) => db.bookings.filter((b) => b.vehicleId === v.id && b.pickupAt >= start && b.pickupAt < end).length },
              { key: 'days', header: 'Rental Days', align: 'right', render: (v) => sum(db.bookings.filter((b) => b.vehicleId === v.id && b.pickupAt >= start && b.pickupAt < end), (b) => b.rentalDays) },
              { key: 'revenue', header: 'Revenue', align: 'right', render: (v) => formatCurrency(sum(db.bookings.filter((b) => b.vehicleId === v.id && b.pickupAt >= start && b.pickupAt < end), (b) => b.rentalDays * b.dailyRate)) },
            ]}
            rows={db.vehicles}
            rowKey={(v) => v.id}
          />
        )}

        {reportType === 'investor' && (
          <DataTable
            columns={[
              { key: 'investor', header: 'Investor', render: (i) => i.fullName },
              { key: 'capital', header: 'Capital', align: 'right', render: (i) => formatCurrency(i.capitalBalance) },
              { key: 'ownership', header: 'Ownership', align: 'right', render: (i) => `${i.ownershipPct}%` },
              { key: 'profit', header: 'Profit Share', align: 'right', render: (i) => `${i.profitSharePct}%` },
              { key: 'allocated', header: 'Allocated (period)', align: 'right', render: (i) => formatCurrency(sum(db.profitAllocations.filter((a) => a.investorId === i.id && a.period === period), (a) => a.allocatedAmount)) },
            ]}
            rows={db.investors}
            rowKey={(i) => i.id}
          />
        )}

        {reportType === 'outstanding' && (
          <DataTable
            columns={[
              { key: 'customer', header: 'Customer', render: (c) => c.type === 'Corporate' ? c.companyName : c.fullName },
              { key: 'outstanding', header: 'Outstanding', align: 'right', render: (c) => {
                const custBookings = db.bookings.filter((b) => b.customerId === c.id);
                const outstanding = sum(custBookings, (b) => {
                  const paid = sum(db.payments.filter((p) => p.bookingId === b.id && !p.isDeposit && p.status === 'Paid'), (p) => p.amount);
                  return Math.max(b.rentalDays * b.dailyRate - paid, 0);
                });
                return formatCurrency(outstanding);
              } },
            ]}
            rows={db.customers}
            rowKey={(c) => c.id}
          />
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between py-1.5"><span className="text-slate-600">{label}</span><span className="font-medium text-slate-900">{value}</span></div>;
}
function groupByCategory(expenses: { category: string; amount: number }[]): Record<string, number> {
  return expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {} as Record<string, number>);
}
