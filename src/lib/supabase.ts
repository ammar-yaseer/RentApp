// src/lib/supabase.ts
// Supabase client + camelCase↔snake_case transform helpers.
// The DB uses snake_case columns; the frontend types use camelCase.
// Every read/write goes through these transforms.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Create a .env file with these values (see SETUP.md).'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

// === camelCase ↔ snake_case transforms ===

/** Convert a snake_case string to camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert a camelCase string to snake_case */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Transform a DB row (snake_case keys) to a frontend object (camelCase keys).
 * JSONB columns (permissions, contacts, customer_documents, etc.) pass through
 * unchanged — their internal keys are already camelCase.
 */
export function toCamel<T = Record<string, any>>(row: Record<string, any> | null): T | null {
  if (!row) return null;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}

/** Transform an array of DB rows to camelCase objects. */
export function toCamelArray<T = Record<string, any>>(rows: Record<string, any>[] | null): T[] {
  if (!rows) return [];
  return rows.map((row) => toCamel<T>(row) as T);
}

/**
 * Transform a frontend object (camelCase keys) to a DB row (snake_case keys).
 * JSONB values pass through unchanged.
 */
export function toSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue; // skip undefined — don't overwrite DB defaults
    result[camelToSnake(key)] = value;
  }
  return result;
}

/** Map of frontend Database keys to DB table names (they're the same in snake_case). */
export const TABLE_MAP: Record<string, string> = {
  branches: 'branches',
  vehicles: 'vehicles',
  vehicleDocuments: 'vehicle_documents',
  customers: 'customers',
  drivers: 'drivers',
  bookings: 'bookings',
  inspections: 'inspections',
  payments: 'payments',
  deposits: 'deposits',
  documents: 'documents',
  expenses: 'expenses',
  vendors: 'vendors',
  leaseContracts: 'lease_contracts',
  leasePayments: 'lease_payments',
  insurances: 'insurances',
  insuranceClaims: 'insurance_claims',
  maintenances: 'maintenances',
  investors: 'investors',
  investorTransactions: 'investor_transactions',
  profitAllocations: 'profit_allocations',
  reserveAccounts: 'reserve_accounts',
  reserveTransactions: 'reserve_transactions',
  settlements: 'settlements',
  bankAccounts: 'bank_accounts',
  bankTransactions: 'bank_transactions',
  notifications: 'notifications',
  notificationTemplates: 'notification_templates',
  auditLogs: 'audit_logs',
};
