import type { ReactNode } from 'react';
import {
  LayoutDashboard, Car, Users, CalendarDays, Wallet, Receipt,
  FileText, Banknote, ShieldCheck, Wrench, Users2, TrendingUp,
  PiggyBank, Banknote as Bank, UserCircle, Bell, BarChart3,
  ScrollText, Settings as SettingsIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: ReactNode;
  group: 'Operations' | 'Finance' | 'Partnership' | 'System';
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', shortLabel: 'Home', path: '/', icon: <LayoutDashboard size={18} />, group: 'Operations' },
  { key: 'vehicles', label: 'Vehicles', shortLabel: 'Vehicles', path: '/vehicles', icon: <Car size={18} />, group: 'Operations' },
  { key: 'customers', label: 'Customers', shortLabel: 'Customers', path: '/customers', icon: <Users size={18} />, group: 'Operations' },
  { key: 'bookings', label: 'Bookings', shortLabel: 'Bookings', path: '/bookings', icon: <CalendarDays size={18} />, group: 'Operations' },
  { key: 'drivers', label: 'Drivers', shortLabel: 'Drivers', path: '/drivers', icon: <UserCircle size={18} />, group: 'Operations' },
  { key: 'payments', label: 'Payments', shortLabel: 'Payments', path: '/payments', icon: <Wallet size={18} />, group: 'Finance' },
  { key: 'deposits', label: 'Deposits', shortLabel: 'Deposits', path: '/deposits', icon: <Banknote size={18} />, group: 'Finance' },
  { key: 'invoices', label: 'Invoices & Receipts', shortLabel: 'Invoices', path: '/invoices', icon: <Receipt size={18} />, group: 'Finance' },
  { key: 'expenses', label: 'Expenses', shortLabel: 'Expenses', path: '/expenses', icon: <FileText size={18} />, group: 'Finance' },
  { key: 'lease', label: 'Lease Management', shortLabel: 'Lease', path: '/lease', icon: <Banknote size={18} />, group: 'Finance' },
  { key: 'insurance', label: 'Insurance', shortLabel: 'Insurance', path: '/insurance', icon: <ShieldCheck size={18} />, group: 'Finance' },
  { key: 'maintenance', label: 'Maintenance', shortLabel: 'Maintenance', path: '/maintenance', icon: <Wrench size={18} />, group: 'Finance' },
  { key: 'cashbank', label: 'Cash & Bank', shortLabel: 'Cash/Bank', path: '/cashbank', icon: <Bank size={18} />, group: 'Finance' },
  { key: 'reserves', label: 'Reserves', shortLabel: 'Reserves', path: '/reserves', icon: <PiggyBank size={18} />, group: 'Finance' },
  { key: 'investors', label: 'Investors', shortLabel: 'Investors', path: '/investors', icon: <Users2 size={18} />, group: 'Partnership' },
  { key: 'profit', label: 'Profit Distribution', shortLabel: 'Profit', path: '/profit', icon: <TrendingUp size={18} />, group: 'Partnership' },
  { key: 'settlements', label: 'Settlements', shortLabel: 'Settlements', path: '/settlements', icon: <Banknote size={18} />, group: 'Partnership' },
  { key: 'notifications', label: 'Notifications', shortLabel: 'Alerts', path: '/notifications', icon: <Bell size={18} />, group: 'System' },
  { key: 'reports', label: 'Reports', shortLabel: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, group: 'System' },
  { key: 'audit', label: 'Audit Logs', shortLabel: 'Audit', path: '/audit', icon: <ScrollText size={18} />, group: 'System' },
  { key: 'settings', label: 'Settings', shortLabel: 'Settings', path: '/settings', icon: <SettingsIcon size={18} />, group: 'System' },
];

// Items shown in the mobile bottom bar (most-used)
export const MOBILE_PRIMARY: string[] = ['dashboard', 'bookings', 'vehicles', 'payments', 'more'];
