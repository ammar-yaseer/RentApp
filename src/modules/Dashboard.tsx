import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, Car, AlertTriangle, CalendarClock,
  Banknote, PiggyBank, Users2, ShieldCheck, Wrench, ArrowRight,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Plus,
} from 'lucide-react';
import { useStore } from '../data/store';
import { useDashboardStats, useLookups } from '../lib/hooks';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { formatCurrency, formatDateTime, isOverdue, cn, monthKey } from '../lib/utils';
import { Calendar } from '../components/Calendar';

export default function Dashboard() {
  const { db } = useStore();
  const stats = useDashboardStats();
  const lookups = useLookups();
  const [calView, setCalView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const todayPickups = db.bookings.filter((b) => {
    const d = new Date(b.pickupAt);
    const t = new Date();
    return d.toDateString() === t.toDateString() && ['Confirmed', 'Reserved'].includes(b.status);
  });
  const todayReturns = db.bookings.filter((b) => {
    const d = new Date(b.returnAt);
    const t = new Date();
    return d.toDateString() === t.toDateString() && ['Active', 'Due Return'].includes(b.status);
  });

  // Charts data
  const monthlyChart = useMemo(() => {
    const months: { key: string; label: string; revenue: number; expenses: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mKey = monthKey(d);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const rev = db.payments.filter((p) => p.date >= start && p.date < end && p.status === 'Paid' && !p.isDeposit).reduce((a, p) => a + p.amount, 0);
      const exp = db.expenses.filter((e) => e.date >= start && e.date < end).reduce((a, e) => a + e.amount, 0);
      months.push({ key: mKey, label: d.toLocaleString('en', { month: 'short' }), revenue: rev, expenses: exp, profit: rev - exp });
    }
    return months;
  }, [db]);

  const vehicleUtil = useMemo(() => {
    return db.vehicles.map((v) => {
      const bookings = db.bookings.filter((b) => b.vehicleId === v.id && b.status !== 'Cancelled' && b.status !== 'No-show');
      const rentalDays = bookings.reduce((a, b) => a + b.rentalDays, 0);
      const util = Math.min((rentalDays / 30) * 100, 100);
      return { name: `${v.make} ${v.model}`, util: Math.round(util), reg: v.regNumber };
    }).slice(0, 6);
  }, [db]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time control center for your rent-a-car business"
        actions={
          <Link to="/bookings"><Button icon={<Plus size={16} />}>New Booking</Button></Link>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <StatCard label="Today's Revenue" value={formatCurrency(stats.revenueToday)} icon={<TrendingUp size={18} />} tone="green" />
        <StatCard label="Today's Expenses" value={formatCurrency(stats.expensesTodayTotal)} icon={<TrendingDown size={18} />} tone="red" />
        <StatCard label="Today's Profit" value={formatCurrency(stats.profitToday)} icon={<Wallet size={18} />} tone="blue" />
        <StatCard label="Monthly Revenue" value={formatCurrency(stats.revenueMonth)} icon={<TrendingUp size={18} />} tone="green" />
        <StatCard label="Monthly Expenses" value={formatCurrency(stats.expensesMonthTotal)} icon={<TrendingDown size={18} />} tone="red" />
        <StatCard label="Monthly Net Profit" value={formatCurrency(stats.profitMonth)} icon={<Wallet size={18} />} tone="blue" />
        <StatCard label="Active Rentals" value={stats.activeRentals} hint={`${stats.upcomingRentals} upcoming`} icon={<Car size={18} />} tone="indigo" onClick={() => {}} />
        <StatCard label="Available Vehicles" value={stats.availableVehicles} hint={`${stats.rentedVehicles} rented · ${stats.maintenanceVehicles} maintenance`} icon={<Car size={18} />} tone="green" />
        <StatCard label="Overdue Rentals" value={stats.overdueRentals.length} icon={<AlertTriangle size={18} />} tone="red" />
        <StatCard label="Deposits Held" value={formatCurrency(stats.depositsHeld)} icon={<Banknote size={18} />} tone="amber" />
        <StatCard label="Outstanding Payments" value={formatCurrency(stats.outstandingPayments)} icon={<Wallet size={18} />} tone="red" />
        <StatCard label="Lease Due" value={formatCurrency(stats.leaseDue)} icon={<Banknote size={18} />} tone="amber" />
        <StatCard label="Insurance Renewals" value={stats.insuranceRenewals} hint="next 30 days" icon={<ShieldCheck size={18} />} tone="amber" />
        <StatCard label="Maintenance Due" value={stats.maintenanceDue} hint="next 7 days" icon={<Wrench size={18} />} tone="amber" />
        <StatCard label="Investor Capital" value={formatCurrency(stats.investorCapital)} icon={<Users2 size={18} />} tone="indigo" />
        <StatCard label="Cash + Bank" value={formatCurrency(stats.cashBalance + stats.bankBalance)} icon={<PiggyBank size={18} />} tone="green" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue vs Expenses" subtitle="Last 6 months" />
          <RevenueChart data={monthlyChart} />
        </Card>
        <Card>
          <CardHeader title="Vehicle Utilization" subtitle="This month" />
          <UtilChart data={vehicleUtil} />
        </Card>
      </div>

      {/* Action center */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard title="Today's Pickups" count={todayPickups.length} items={todayPickups.map((b) => ({
          id: b.id, label: lookups.customerLabel(b.customerId), sub: lookups.vehicleLabel(b.vehicleId), time: b.pickupAt, to: `/bookings/${b.id}`,
        }))} />
        <ActionCard title="Today's Returns" count={todayReturns.length} items={todayReturns.map((b) => ({
          id: b.id, label: lookups.customerLabel(b.customerId), sub: lookups.vehicleLabel(b.vehicleId), time: b.returnAt, to: `/bookings/${b.id}`,
        }))} />
        <ActionCard title="Overdue Rentals" count={stats.overdueRentals.length} tone="red" items={stats.overdueRentals.map((b) => ({
          id: b.id, label: lookups.customerLabel(b.customerId), sub: lookups.vehicleLabel(b.vehicleId), time: b.returnAt, to: `/bookings/${b.id}`,
        }))} />
        <ActionCard title="Lease Due" count={db.leasePayments.filter((p) => p.status !== 'Paid').length} tone="amber" items={db.leasePayments.filter((p) => p.status !== 'Paid').slice(0, 5).map((p) => ({
          id: p.id, label: `Lease ${lookups.lease(p.leaseId)?.leaseNumber ?? ''}`, sub: formatCurrency(p.amount), time: p.dueDate, to: '/lease',
        }))} />
      </div>

      {/* Investor Summary */}
      <InvestorSummary />

      {/* Vehicle Availability — Today & This Week */}
      <VehicleAvailabilitySection />

      {/* Calendar */}
      <Card>
        <CardHeader
          title="Rental Calendar"
          subtitle="Live operational view of the fleet"
          action={
            <div className="flex items-center gap-2">
              <select className="input !py-1.5 !w-auto" value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
                <option value="">All vehicles</option>
                {db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNumber}</option>)}
              </select>
              <select className="input !py-1.5 !w-auto hidden sm:block" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                {['Inquiry', 'Reserved', 'Confirmed', 'Active', 'Overdue', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Show completed
              </label>
            </div>
          }
        />
        <Tabs
          tabs={[
            { key: 'month', label: 'Month' },
            { key: 'week', label: 'Week' },
            { key: 'day', label: 'Day' },
            { key: 'agenda', label: 'Agenda' },
          ]}
          active={calView}
          onChange={(k) => setCalView(k as typeof calView)}
        />
        <div className="mt-4">
          <Calendar
            view={calView}
            events={db.bookings
              .filter((b) => !filterVehicle || b.vehicleId === filterVehicle)
              .filter((b) => !filterStatus || b.status === filterStatus)
              .filter((b) => showCompleted || !['Completed', 'Cancelled', 'No-show'].includes(b.status))
              .map((b) => ({
                id: b.id,
                title: `${lookups.vehicleLabel(b.vehicleId)} — ${lookups.customerLabel(b.customerId)}`,
                start: b.pickupAt,
                end: b.returnAt,
                status: isOverdue(b.returnAt, b.status) ? 'Overdue' : b.status,
                to: `/bookings/${b.id}`,
              }))}
            colors={db.settings.calendarColors}
          />
        </div>
      </Card>

      {/* Overdue panel */}
      {stats.overdueRentals.length > 0 && (
        <Card>
          <CardHeader title="Overdue Rentals" subtitle="Vehicles not returned on time" action={<StatusBadge status="Overdue" />} />
          <div className="space-y-2">
            {stats.overdueRentals.map((b) => {
              const overdueMs = Date.now() - new Date(b.returnAt).getTime();
              const days = Math.floor(overdueMs / 86400000);
              const hours = Math.floor((overdueMs % 86400000) / 3600000);
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{lookups.vehicleLabel(b.vehicleId)}</p>
                    <p className="text-xs text-slate-600 truncate">{b.number} · {lookups.customerLabel(b.customerId)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-red-700">Overdue {days}d {hours}h</p>
                    <p className="text-xs text-slate-500">Due: {formatDateTime(b.returnAt)}</p>
                  </div>
                  <Link to={`/bookings/${b.id}`} className="btn-secondary btn-sm shrink-0">Record Return</Link>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function ActionCard({ title, count, items, tone = 'default' }: {
  title: string; count: number; items: { id: string; label?: string; sub: string; time: string; to: string }[];
  tone?: 'default' | 'red' | 'amber';
}) {
  const toneClass = tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900';
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className={cn('text-2xl font-bold', toneClass)}>{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">None</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((it) => (
            <Link key={it.id} to={it.to} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{it.label}</p>
                <p className="text-xs text-slate-500 truncate">{it.sub}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-600">{formatDateTime(it.time)}</p>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-600 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function RevenueChart({ data }: { data: { key: string; label: string; revenue: number; expenses: number; profit: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 1);
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-48">
        {data.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-1 h-40">
              <div className="w-3 sm:w-4 bg-brand-500 rounded-t" style={{ height: `${(d.revenue / max) * 100}%` }} title={`Revenue: ${formatCurrency(d.revenue)}`} />
              <div className="w-3 sm:w-4 bg-red-400 rounded-t" style={{ height: `${(d.expenses / max) * 100}%` }} title={`Expenses: ${formatCurrency(d.expenses)}`} />
            </div>
            <span className="text-xs text-slate-500">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500" />Revenue</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" />Expenses</span>
      </div>
    </div>
  );
}

function UtilChart({ data }: { data: { name: string; util: number; reg: string }[] }) {
  if (data.length === 0) return <EmptyState title="No vehicles" />;
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.reg}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-slate-700 truncate">{d.name}</span>
            <span className="text-slate-500">{d.util}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', d.util > 70 ? 'bg-green-500' : d.util > 40 ? 'bg-amber-500' : 'bg-slate-300')} style={{ width: `${d.util}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InvestorSummary() {
  const { db } = useStore();
  const active = db.investors.filter((i) => i.status === 'Active');
  const totalCapital = active.reduce((s, i) => s + i.capitalBalance, 0);
  const totalOwnership = active.reduce((s, i) => s + i.ownershipPct, 0);

  // Current month expenses & profit
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const monthRevenue = db.payments.filter((p) => p.date >= startMonth && p.date < nextMonth && p.status === 'Paid' && !p.isDeposit).reduce((s, p) => s + p.amount, 0);
  const monthExpenses = db.expenses.filter((e) => e.date >= startMonth && e.date < nextMonth).reduce((s, e) => s + e.amount, 0);
  const distributable = monthRevenue - monthExpenses;

  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Investor Summary"
        subtitle="Ownership %, capital, and profit share"
        action={<Link to="/investors" className="text-xs text-brand-600 hover:underline">Manage →</Link>}
      />
      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Total Capital</p>
          <p className="text-base font-bold text-slate-900">{formatCurrency(totalCapital)}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Active Investors</p>
          <p className="text-base font-bold text-slate-900">{active.length}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Month Expenses</p>
          <p className="text-base font-bold text-red-600">{formatCurrency(monthExpenses)}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Distributable Profit</p>
          <p className={cn('text-base font-bold', distributable >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(distributable)}</p>
        </div>
      </div>

      {/* Per-investor breakdown */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-2 py-2">Investor</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-2 py-2">Capital</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-2 py-2">Ownership</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-2 py-2">Profit Share</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-2 py-2">Est. Profit</th>
            </tr>
          </thead>
          <tbody>
            {active.map((inv) => {
              const estProfit = distributable * (inv.profitSharePct / 100);
              return (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="px-2 py-2.5">
                    <p className="font-medium text-slate-900 truncate">{inv.fullName}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden max-w-[120px]">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${inv.ownershipPct}%` }} />
                    </div>
                  </td>
                  <td className="text-right px-2 py-2.5 text-slate-700">{formatCurrency(inv.capitalBalance)}</td>
                  <td className="text-right px-2 py-2.5 font-semibold text-slate-900">{inv.ownershipPct}%</td>
                  <td className="text-right px-2 py-2.5 text-slate-700">{inv.profitSharePct}%</td>
                  <td className={cn('text-right px-2 py-2.5 font-semibold', estProfit >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(estProfit)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-semibold">
              <td className="px-2 py-2">Total</td>
              <td className="text-right px-2 py-2">{formatCurrency(totalCapital)}</td>
              <td className="text-right px-2 py-2">{totalOwnership.toFixed(2)}%</td>
              <td className="text-right px-2 py-2">{active.reduce((s, i) => s + i.profitSharePct, 0).toFixed(2)}%</td>
              <td className={cn('text-right px-2 py-2', distributable >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(distributable)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function VehicleAvailabilitySection() {
  const { db } = useStore();
  const lookups = useLookups();
  const [view, setView] = useState<'today' | 'week'>('today');

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const vehicleStatus = db.vehicles.map((v) => {
    // Find active/current booking
    const activeBooking = db.bookings.find((b) => {
      if (b.vehicleId !== v.id) return false;
      if (['Cancelled', 'Completed', 'No-show'].includes(b.status)) return false;
      const start = new Date(b.pickupAt).getTime();
      const end = new Date(b.returnAt).getTime();
      return now.getTime() >= start && now.getTime() <= end;
    });
    // Find upcoming booking within the week
    const upcomingBooking = db.bookings.find((b) => {
      if (b.vehicleId !== v.id) return false;
      if (['Cancelled', 'Completed', 'No-show'].includes(b.status)) return false;
      const start = new Date(b.pickupAt).getTime();
      return start > now.getTime() && start <= weekEnd.getTime();
    });
    return {
      vehicle: v,
      activeBooking,
      upcomingBooking,
      isAvailable: !activeBooking && v.status === 'Available',
      isRented: !!activeBooking && activeBooking.rentalType === 'Rent',
      isHired: !!activeBooking && activeBooking.rentalType === 'Hire',
    };
  });

  const available = vehicleStatus.filter((v) => v.isAvailable);
  const rented = vehicleStatus.filter((v) => v.isRented);
  const hired = vehicleStatus.filter((v) => v.isHired);
  const other = vehicleStatus.filter((v) => !v.isAvailable && !v.isRented && !v.isHired);

  return (
    <Card>
      <CardHeader
        title="Vehicle Availability"
        subtitle={view === 'today' ? "Today's fleet status" : 'Next 7 days overview'}
        action={
          <div className="flex gap-1">
            <button onClick={() => setView('today')} className={cn('btn-sm', view === 'today' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700')}>Today</button>
            <button onClick={() => setView('week')} className={cn('btn-sm', view === 'week' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700')}>This Week</button>
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-green-50 border border-green-200">
          <p className="text-2xl font-bold text-green-600">{available.length}</p>
          <p className="text-xs text-green-700">Available</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{rented.length}</p>
          <p className="text-xs text-blue-700">Rented (Self-Drive)</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-2xl font-bold text-purple-600">{hired.length}</p>
          <p className="text-xs text-purple-700">Hired (With Driver)</p>
        </div>
      </div>

      <div className="space-y-2">
        {/* Available vehicles */}
        {available.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1">✓ Available Now</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {available.map(({ vehicle }) => (
                <Link key={vehicle.id} to={`/vehicles/${vehicle.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
                  {vehicle.photoUrl ? <img src={vehicle.photoUrl} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" /> : <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center"><Car size={18} className="text-slate-400" /></div>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-slate-500">{vehicle.regNumber}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rented vehicles with return dates */}
        {rented.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1 mt-3">🚗 Rented — Return Dates</p>
            <div className="space-y-1">
              {rented.map(({ vehicle, activeBooking }) => activeBooking && (
                <Link key={vehicle.id} to={`/bookings/${activeBooking.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                  {vehicle.photoUrl ? <img src={vehicle.photoUrl} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" /> : <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center"><Car size={18} className="text-slate-400" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{vehicle.make} {vehicle.model} ({vehicle.regNumber})</p>
                    <p className="text-xs text-slate-500">{lookups.customerLabel(activeBooking.customerId)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-blue-700">Returns</p>
                    <p className="text-xs text-slate-600">{formatDateTime(activeBooking.returnAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hired vehicles with return dates */}
        {hired.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-purple-700 mb-1 mt-3">🚕 Hired — Return Dates</p>
            <div className="space-y-1">
              {hired.map(({ vehicle, activeBooking }) => activeBooking && (
                <Link key={vehicle.id} to={`/bookings/${activeBooking.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors">
                  {vehicle.photoUrl ? <img src={vehicle.photoUrl} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" /> : <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center"><Car size={18} className="text-slate-400" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{vehicle.make} {vehicle.model} ({vehicle.regNumber})</p>
                    <p className="text-xs text-slate-500">{lookups.customerLabel(activeBooking.customerId)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-purple-700">Returns</p>
                    <p className="text-xs text-slate-600">{formatDateTime(activeBooking.returnAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Other (maintenance, etc.) */}
        {other.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-1 mt-3">🔧 Unavailable</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {other.map(({ vehicle }) => (
                <Link key={vehicle.id} to={`/vehicles/${vehicle.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors">
                  {vehicle.photoUrl ? <img src={vehicle.photoUrl} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" /> : <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center"><Car size={18} className="text-slate-400" /></div>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-slate-500">{vehicle.regNumber} · {vehicle.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming this week */}
        {view === 'week' && (
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1 mt-3">📅 Upcoming Bookings (Next 7 Days)</p>
            <div className="space-y-1">
              {vehicleStatus.filter((v) => v.upcomingBooking).map(({ vehicle, upcomingBooking }) => upcomingBooking && (
                <Link key={vehicle.id} to={`/bookings/${upcomingBooking.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{vehicle.make} {vehicle.model} ({vehicle.regNumber})</p>
                    <p className="text-xs text-slate-500">{lookups.customerLabel(upcomingBooking.customerId)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-brand-700">Pickup</p>
                    <p className="text-xs text-slate-600">{formatDateTime(upcomingBooking.pickupAt)}</p>
                  </div>
                </Link>
              ))}
              {vehicleStatus.filter((v) => v.upcomingBooking).length === 0 && (
                <p className="text-xs text-slate-400 p-2">No upcoming bookings in the next 7 days.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
