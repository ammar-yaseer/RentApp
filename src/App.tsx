import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './lib/auth';
import { useCurrentUser } from './lib/hooks';
import { canView, visibleNavItems } from './lib/permissions';
import Login from './modules/Login';

const Dashboard = lazy(() => import('./modules/Dashboard'));
const Vehicles = lazy(() => import('./modules/Vehicles'));
const Customers = lazy(() => import('./modules/Customers'));
const Bookings = lazy(() => import('./modules/Bookings'));
const Drivers = lazy(() => import('./modules/Drivers'));
const Payments = lazy(() => import('./modules/Payments'));
const Deposits = lazy(() => import('./modules/Deposits'));
const Invoices = lazy(() => import('./modules/Invoices'));
const Expenses = lazy(() => import('./modules/Expenses'));
const Lease = lazy(() => import('./modules/Lease'));
const Insurance = lazy(() => import('./modules/Insurance'));
const Maintenance = lazy(() => import('./modules/Maintenance'));
const CashBank = lazy(() => import('./modules/CashBank'));
const Reserves = lazy(() => import('./modules/Reserves'));
const Investors = lazy(() => import('./modules/Investors'));
const Profit = lazy(() => import('./modules/Profit'));
const Settlements = lazy(() => import('./modules/Settlements'));
const Notifications = lazy(() => import('./modules/Notifications'));
const Reports = lazy(() => import('./modules/Reports'));
const Audit = lazy(() => import('./modules/Audit'));
const Settings = lazy(() => import('./modules/Settings'));

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

/** Wraps a route element so it only renders when the current user can view the module. */
function Guard({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const user = useCurrentUser();
  if (!canView(user, moduleKey)) {
    // Redirect to the first accessible module (or root which shows NoAccess).
    const first = visibleNavItems(user)[0];
    return <Navigate to={first?.path ?? '/'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { profile, loading } = useAuth();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in → show login page
  if (!profile) {
    return <Login />;
  }

  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Guard moduleKey="dashboard"><Dashboard /></Guard>} />
          <Route path="/vehicles" element={<Guard moduleKey="vehicles"><Vehicles /></Guard>} />
          <Route path="/vehicles/:id" element={<Guard moduleKey="vehicles"><Vehicles /></Guard>} />
          <Route path="/customers" element={<Guard moduleKey="customers"><Customers /></Guard>} />
          <Route path="/customers/:id" element={<Guard moduleKey="customers"><Customers /></Guard>} />
          <Route path="/bookings" element={<Guard moduleKey="bookings"><Bookings /></Guard>} />
          <Route path="/bookings/:id" element={<Guard moduleKey="bookings"><Bookings /></Guard>} />
          <Route path="/drivers" element={<Guard moduleKey="drivers"><Drivers /></Guard>} />
          <Route path="/payments" element={<Guard moduleKey="payments"><Payments /></Guard>} />
          <Route path="/deposits" element={<Guard moduleKey="deposits"><Deposits /></Guard>} />
          <Route path="/invoices" element={<Guard moduleKey="invoices"><Invoices /></Guard>} />
          <Route path="/expenses" element={<Guard moduleKey="expenses"><Expenses /></Guard>} />
          <Route path="/lease" element={<Guard moduleKey="lease"><Lease /></Guard>} />
          <Route path="/insurance" element={<Guard moduleKey="insurance"><Insurance /></Guard>} />
          <Route path="/maintenance" element={<Guard moduleKey="maintenance"><Maintenance /></Guard>} />
          <Route path="/cashbank" element={<Guard moduleKey="cashbank"><CashBank /></Guard>} />
          <Route path="/reserves" element={<Guard moduleKey="reserves"><Reserves /></Guard>} />
          <Route path="/investors" element={<Guard moduleKey="investors"><Investors /></Guard>} />
          <Route path="/profit" element={<Guard moduleKey="profit"><Profit /></Guard>} />
          <Route path="/settlements" element={<Guard moduleKey="settlements"><Settlements /></Guard>} />
          <Route path="/notifications" element={<Guard moduleKey="notifications"><Notifications /></Guard>} />
          <Route path="/reports" element={<Guard moduleKey="reports"><Reports /></Guard>} />
          <Route path="/audit" element={<Guard moduleKey="audit"><Audit /></Guard>} />
          <Route path="/settings" element={<Guard moduleKey="settings"><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
