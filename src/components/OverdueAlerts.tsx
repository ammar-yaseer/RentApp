// NOTE: When migrating to Supabase, replace this client-side polling with
// Supabase real-time subscriptions + a scheduled Edge Function for date-based alerts.
import { useEffect, useRef } from 'react';
import { useStore } from '../data/store';
import { useToast } from './Toast';
import { isOverdue, formatDateTime } from '../lib/utils';

/**
 * Monitors the database for overdue/critical items and fires toast alerts.
 * Runs once on app load and then periodically checks.
 */
export function OverdueAlerts() {
  const { db } = useStore();
  const toast = useToast();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkAlerts = () => {
      const now = Date.now();
      const todayKey = new Date().toISOString().slice(0, 10);

      // 1. Overdue bookings (return date passed, still Active)
      db.bookings.forEach((b) => {
        const alertKey = `overdue-booking-${b.id}-${todayKey}`;
        if (isOverdue(b.returnAt, b.status) && !firedRef.current.has(alertKey)) {
          firedRef.current.add(alertKey);
          toast.error(
            `Overdue: Booking ${b.number}`,
            `Vehicle should have been returned by ${formatDateTime(b.returnAt)}`
          );
        }
      });

      // 2. Bookings due for return today
      db.bookings.forEach((b) => {
        const alertKey = `due-return-${b.id}-${todayKey}`;
        const returnTime = new Date(b.returnAt).getTime();
        const isToday = new Date(b.returnAt).toDateString() === new Date().toDateString();
        if (isToday && (b.status === 'Active' || b.status === 'Due Return') && !firedRef.current.has(alertKey)) {
          firedRef.current.add(alertKey);
          toast.warning(
            `Due Return Today: ${b.number}`,
            `Vehicle return due at ${formatDateTime(b.returnAt)}`
          );
        }
      });

      // 3. Pickups today
      db.bookings.forEach((b) => {
        const alertKey = `pickup-today-${b.id}-${todayKey}`;
        const isToday = new Date(b.pickupAt).toDateString() === new Date().toDateString();
        if (isToday && (b.status === 'Confirmed' || b.status === 'Reserved') && !firedRef.current.has(alertKey)) {
          firedRef.current.add(alertKey);
          toast.info(
            `Pickup Today: ${b.number}`,
            `Scheduled pickup at ${formatDateTime(b.pickupAt)}`
          );
        }
      });

      // 4. Insurance expiring within 7 days
      db.insurances.forEach((ins) => {
        const alertKey = `ins-expiry-${ins.id}-${todayKey}`;
        if (ins.status !== 'Active') return;
        const days = (new Date(ins.expiryDate).getTime() - now) / 86400000;
        if (days <= 7 && days >= 0 && !firedRef.current.has(alertKey)) {
          firedRef.current.add(alertKey);
          toast.warning(
            `Insurance Expiring Soon`,
            `Policy ${ins.policyNumber ?? '—'} expires in ${Math.ceil(days)} day(s)`
          );
        }
      });

      // 5. Lease payments due
      db.leasePayments.forEach((p) => {
        const alertKey = `lease-due-${p.id}-${todayKey}`;
        if (p.status === 'Paid') return;
        const days = (new Date(p.dueDate).getTime() - now) / 86400000;
        if (days <= 3 && !firedRef.current.has(alertKey)) {
          firedRef.current.add(alertKey);
          toast.warning(
            days < 0 ? `Lease Payment Overdue` : `Lease Payment Due`,
            `Payment of ${p.amount.toLocaleString()} due ${formatDateTime(p.dueDate)}`
          );
        }
      });

      // 6. Maintenance due (next service date within 3 days)
      db.maintenances.forEach((m) => {
        const alertKey = `maint-due-${m.id}-${todayKey}`;
        if (!m.nextServiceDate) return;
        const days = (new Date(m.nextServiceDate).getTime() - now) / 86400000;
        if (days <= 3 && days >= -7 && !firedRef.current.has(alertKey)) {
          firedRef.current.add(alertKey);
          toast.info(
            `Maintenance Due`,
            `Next service scheduled for ${formatDateTime(m.nextServiceDate)}`
          );
        }
      });
    };

    // Check on load
    const timer = setTimeout(checkAlerts, 1500); // slight delay to let UI render

    // Check every 5 minutes
    const interval = setInterval(checkAlerts, 5 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [db, toast]);

  return null;
}
