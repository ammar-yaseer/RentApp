// Centralized hooks for derived data lookups used across modules.
import { useMemo } from 'react';
import { useStore, getCurrentUserId } from '../data/store';
import { isOverdue, sum } from '../lib/utils';
import type { User } from '../types';

export function useLookups() {
  const { db } = useStore();
  return useMemo(() => {
    const vehicle = (id?: string) => db.vehicles.find((v) => v.id === id);
    const customer = (id?: string) => db.customers.find((c) => c.id === id);
    const driver = (id?: string) => db.drivers.find((d) => d.id === id);
    const investor = (id?: string) => db.investors.find((i) => i.id === id);
    const booking = (id?: string) => db.bookings.find((b) => b.id === id);
    const vendor = (id?: string) => db.vendors.find((v) => v.id === id);
    const lease = (id?: string) => db.leaseContracts.find((l) => l.id === id);
    const insurance = (id?: string) => db.insurances.find((i) => i.id === id);
    const reserve = (id?: string) => db.reserveAccounts.find((r) => r.id === id);
    const bank = (id?: string) => db.bankAccounts.find((b) => b.id === id);
    const branch = (id?: string) => db.branches.find((b) => b.id === id);

    const vehicleLabel = (id?: string) => {
      const v = vehicle(id);
      return v ? `${v.make} ${v.model} (${v.regNumber})` : '—';
    };
    const customerLabel = (id?: string) => {
      const c = customer(id);
      return c ? (c.type === 'Corporate' ? (c.companyName ?? '—') : (c.fullName ?? '—')) : '—';
    };
    const investorLabel = (id?: string) => investor(id)?.fullName ?? '—';
    const driverLabel = (id?: string) => driver(id)?.fullName ?? '—';

    return {
      vehicle, customer, driver, investor, booking, vendor, lease, insurance, reserve, bank, branch,
      vehicleLabel, customerLabel, investorLabel, driverLabel,
    };
  }, [db]);
}

export function useDashboardStats() {
  const { db } = useStore();
  return useMemo(() => {
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();

    const paymentsToday = db.payments.filter((p) => p.date >= startToday && p.date < endToday && p.status === 'Paid' && !p.isDeposit);
    const paymentsMonth = db.payments.filter((p) => p.date >= startMonth && p.date < endMonth && p.status === 'Paid' && !p.isDeposit);
    const expensesToday = db.expenses.filter((e) => e.date >= startToday && e.date < endToday);
    const expensesMonth = db.expenses.filter((e) => e.date >= startMonth && e.date < endMonth);

    const revenueToday = sum(paymentsToday, (p) => p.amount);
    const revenueMonth = sum(paymentsMonth, (p) => p.amount);
    const expensesTodayTotal = sum(expensesToday, (e) => e.amount);
    const expensesMonthTotal = sum(expensesMonth, (e) => e.amount);

    const activeRentals = db.bookings.filter((b) => b.status === 'Active').length;
    const upcomingRentals = db.bookings.filter((b) => ['Confirmed', 'Reserved'].includes(b.status) && b.pickupAt > new Date().toISOString()).length;
    const overdueRentals = db.bookings.filter((b) => isOverdue(b.returnAt, b.status) || b.status === 'Overdue');

    const availableVehicles = db.vehicles.filter((v) => v.status === 'Available').length;
    const rentedVehicles = db.vehicles.filter((v) => v.status === 'Rented').length;
    const maintenanceVehicles = db.vehicles.filter((v) => v.status === 'Maintenance').length;

    const depositsHeld = sum(db.deposits.filter((d) => d.status === 'Held'), (d) => d.received - (d.deductions ?? 0));
    const outstandingPayments = sum(db.bookings, (b) => {
      const paid = sum(db.payments.filter((p) => p.bookingId === b.id && !p.isDeposit && p.status === 'Paid'), (p) => p.amount);
      const total = b.rentalDays * b.dailyRate + (b.additionalCharges ?? 0) - (b.discount ?? 0);
      return Math.max(total - paid, 0);
    });

    const leaseDue = sum(db.leasePayments.filter((p) => p.status !== 'Paid'), (p) => p.amount - (p.paidAmount ?? 0));
    const insuranceRenewals = db.insurances.filter((i) => {
      const days = (new Date(i.expiryDate).getTime() - Date.now()) / 86400000;
      return days <= 30 && days >= 0;
    }).length;
    const maintenanceDue = db.maintenances.filter((m) => m.nextServiceDate && new Date(m.nextServiceDate) <= new Date(Date.now() + 7 * 86400000)).length;

    const investorCapital = sum(db.investors.filter((i) => i.status === 'Active'), (i) => i.capitalBalance);
    const investorProfit = sum(db.profitAllocations.filter((p) => p.status === 'Draft'), (p) => p.allocatedAmount);
    const cashBalance = sum(db.bankAccounts.filter((b) => b.type === 'Cash'), (b) => b.currentBalance);
    const bankBalance = sum(db.bankAccounts.filter((b) => b.type === 'Bank'), (b) => b.currentBalance);

    const corporateReceivables = sum(db.customers.filter((c) => c.type === 'Corporate'), (c) => {
      const custBookings = db.bookings.filter((b) => b.customerId === c.id);
      return sum(custBookings, (b) => {
        const paid = sum(db.payments.filter((p) => p.bookingId === b.id && !p.isDeposit && p.status === 'Paid'), (p) => p.amount);
        return Math.max(b.rentalDays * b.dailyRate - paid, 0);
      });
    });

    return {
      revenueToday, revenueMonth, expensesTodayTotal, expensesMonthTotal,
      profitToday: revenueToday - expensesTodayTotal,
      profitMonth: revenueMonth - expensesMonthTotal,
      activeRentals, upcomingRentals, overdueRentals,
      availableVehicles, rentedVehicles, maintenanceVehicles,
      depositsHeld, outstandingPayments, leaseDue,
      insuranceRenewals, maintenanceDue,
      investorCapital, investorProfit, cashBalance, bankBalance, corporateReceivables,
      totalVehicles: db.vehicles.length,
    };
  }, [db]);
}

export function useBookingConflicts() {
  const { db } = useStore();
  return useMemo(() => {
    return (vehicleId: string, pickupAt: string, returnAt: string, excludeBookingId?: string) => {
      const pickup = new Date(pickupAt).getTime();
      const ret = new Date(returnAt).getTime();
      const blocking = db.bookings.filter((b) => {
        if (b.vehicleId !== vehicleId) return false;
        if (b.id === excludeBookingId) return false;
        if (b.status === 'Cancelled' || b.status === 'Completed' || b.status === 'No-show') return false;
        const bStart = new Date(b.pickupAt).getTime();
        const bEnd = new Date(b.returnAt).getTime();
        return pickup < bEnd && ret > bStart;
      });
      const maintBlocking = db.maintenances.filter((m) => {
        if (m.vehicleId !== vehicleId) return false;
        if (!m.nextServiceDate) return false;
        const mStart = new Date(m.serviceDate).getTime();
        const mEnd = new Date(m.nextServiceDate).getTime();
        return pickup < mEnd && ret > mStart;
      });
      return { conflicts: blocking, maintenanceConflicts: maintBlocking, hasConflict: blocking.length > 0 || maintBlocking.length > 0 };
    };
  }, [db]);
}

/** Get booked date ranges for a specific vehicle (for disabling dates in date picker) */
export function useVehicleBookedDates() {
  const { db } = useStore();
  return useMemo(() => {
    return (vehicleId: string, excludeBookingId?: string) => {
      return db.bookings
        .filter((b) => {
          if (b.vehicleId !== vehicleId) return false;
          if (b.id === excludeBookingId) return false;
          return b.status !== 'Cancelled' && b.status !== 'Completed' && b.status !== 'No-show';
        })
        .map((b) => ({
          start: new Date(b.pickupAt),
          end: new Date(b.returnAt),
          bookingNumber: b.number,
        }));
    };
  }, [db]);
}

/**
 * Resolve the currently active user.
 * Falls back to the first user (prototype default) when no explicit selection exists.
 */
export function useCurrentUser(): User | null {
  const { db } = useStore();
  return useMemo(() => {
    const id = getCurrentUserId();
    const found = db.users.find((u) => u.id === id);
    return found ?? db.users[0] ?? null;
  }, [db.users]);
}

