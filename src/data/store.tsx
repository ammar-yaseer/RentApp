// src/data/store.tsx
// Supabase-backed store. Preserves the same useStore() API as the
// localStorage prototype so the ~103 update() call sites need no changes.
//
// How it works:
// - On mount, fetches all tables from Supabase (parallelized) and
//   transforms rows to camelCase.
// - Subscribes to Realtime postgres_changes per table → updates db state.
// - update(key, fn, auditEntry): diffing shim — computes added/removed/changed
//   rows vs current state, issues insert/update/delete to Supabase,
//   and optimistically updates local state. auditEntry is ignored (DB trigger
//   handles audit logging automatically).
// - nextSeq(kind): calls the next_number() RPC.
// - setSettings(patch): updates the settings singleton row.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Database } from '../types';
import { supabase, toCamel, toCamelArray, toSnake, TABLE_MAP } from '../lib/supabase';

// === Types (preserved from old store) ===

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string;
  before?: string;
  after?: string;
}

interface StoreContextValue {
  db: Database;
  update: <K extends keyof Database>(key: K, fn: (current: Database[K]) => Database[K], audit?: AuditEntry) => void;
  setSettings: (patch: Partial<Database['settings']>) => void;
  resetData: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  nextSeq: (kind: 'invoice' | 'receipt' | 'booking' | 'payment' | 'expense' | 'settlement') => string;
  audit: (entry: AuditEntry) => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// === Empty database (used while loading) ===

function emptyDb(): Database {
  return {
    branches: [], vehicles: [], vehicleDocuments: [], customers: [], drivers: [],
    bookings: [], inspections: [], payments: [], deposits: [], documents: [],
    expenses: [], vendors: [], leaseContracts: [], leasePayments: [],
    insurances: [], insuranceClaims: [], maintenances: [], investors: [],
    investorTransactions: [], profitAllocations: [], reserveAccounts: [],
    reserveTransactions: [], settlements: [], bankAccounts: [], bankTransactions: [],
    notifications: [], notificationTemplates: [], auditLogs: [],
    users: [], settings: {
      businessName: '', logoUrl: undefined, address: undefined, taxRegNumber: undefined,
      defaultCurrency: 'LKR', taxRate: 0,
      invoicePrefix: 'INV-', invoiceSeq: 1, receiptPrefix: 'RCP-', receiptSeq: 1,
      bookingPrefix: 'BK-', bookingSeq: 1, paymentPrefix: 'PAY-', paymentSeq: 1,
      expensePrefix: 'EXP-', expenseSeq: 1, settlementPrefix: 'STL-', settlementSeq: 1,
      language: 'en', calendarColors: {}, reminderDefaults: {},
      googleCalendarEmail: undefined, googleCalendarSync: false,
    },
  };
}

// === Table keys that are arrays (not settings) ===
const ARRAY_KEYS = Object.keys(TABLE_MAP) as (keyof Database)[];

// === StoreProvider ===

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => emptyDb());
  const [loading, setLoading] = useState(true);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // === Load all tables on mount ===
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const entries = await Promise.all(
        ARRAY_KEYS.map(async (key) => {
          const table = TABLE_MAP[key as string];
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to load ${table}:`, error.message);
            return [key, []] as const;
          }
          return [key, toCamelArray(data)] as const;
        }),
      );

      // Load settings (singleton)
      const { data: settingsData, error: settingsErr } = await supabase
        .from('settings').select('*').eq('id', 1).single();
      if (settingsErr) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load settings:', settingsErr.message);
      }

      if (cancelled) return;

      const newDb = emptyDb();
      for (const [key, rows] of entries) {
        (newDb as any)[key] = rows;
      }
      if (settingsData) {
        newDb.settings = toCamel<Database['settings']>(settingsData) as Database['settings'];
      }
      setDb(newDb);
      setLoading(false);
    }

    loadAll();

    return () => { cancelled = true; };
  }, []);

  // === Realtime subscriptions ===
  useEffect(() => {
    if (loading) return;

    // Use a single channel for all table changes to stay within Realtime limits
    const channel = supabase.channel('rentflow-db-changes');

    for (const key of ARRAY_KEYS) {
      const table = TABLE_MAP[key as string];
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: any) => {
          const camelRow = payload.new ? toCamel(payload.new) : null;
          setDb((prev) => {
            const arr = [...(prev[key] as any[])] as any[];
            if (payload.eventType === 'INSERT' && camelRow) {
              // Avoid duplicates (Realtime may fire for our own optimistic updates)
              if (!arr.find((r) => r.id === (camelRow as any).id)) {
                arr.unshift(camelRow as any);
              }
            } else if (payload.eventType === 'UPDATE' && camelRow) {
              const idx = arr.findIndex((r) => r.id === (camelRow as any).id);
              if (idx >= 0) arr[idx] = camelRow as any;
              else arr.unshift(camelRow as any);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const oldId = payload.old.id;
              const idx = arr.findIndex((r) => r.id === oldId);
              if (idx >= 0) arr.splice(idx, 1);
            }
            return { ...prev, [key]: arr };
          });
        },
      );
    }

    channel.subscribe();
    realtimeRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading]);

  // === Store value ===
  const value = useMemo<StoreContextValue>(() => {
    const audit = (_entry: AuditEntry) => {
      // Audit is handled by DB triggers — no client action needed.
    };

    return {
      db,
      loading,
      update: (key, fn, _auditEntry) => {
        // Optimistic update: apply fn to local state immediately
        const prevArr = db[key] as any[];
        const nextArr = (fn as any)(prevArr) as any[];
        setDb((prev) => ({ ...prev, [key]: nextArr }));

        // Diff and sync to Supabase
        syncDiff(key as string, prevArr, nextArr);
      },
      setSettings: (patch) => {
        // Optimistic
        setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
        // Sync
        supabase.from('settings').update(toSnake(patch)).eq('id', 1).then(({ error }) => {
          if (error) console.warn('Settings update failed:', error.message);
        });
      },
      resetData: () => {
        // Admin-only: reload from DB (actual reset would require truncation)
        window.location.reload();
      },
      exportData: () => JSON.stringify(db, null, 2),
      importData: (json) => {
        try {
          const parsed = JSON.parse(json) as Database;
          setDb(parsed);
          return true;
        } catch {
          return false;
        }
      },
      nextSeq: (kind) => {
        // Call the atomic RPC. This is async but nextSeq is called synchronously
        // in the old code, so we do an optimistic local increment and fire the RPC.
        const prefixKey = `${kind}Prefix` as keyof Database['settings'];
        const seqKey = `${kind}Seq` as keyof Database['settings'];
        const prefix = db.settings[prefixKey] as string;
        const seq = db.settings[seqKey] as number;
        const num = String(seq).padStart(4, '0');
        const number = `${prefix}${num}`;
        // Optimistic increment
        setDb((prev) => ({
          ...prev,
          settings: { ...prev.settings, [seqKey]: (seq as number) + 1 },
        }));
        // Atomic RPC (fire and forget — the DB is the source of truth)
        supabase.rpc('next_number', { p_kind: kind }).then(({ error }) => {
          if (error) console.warn('next_number RPC failed:', error.message);
        });
        return number;
      },
      audit,
    };
  }, [db, loading]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// === Diff sync: compute added/removed/changed rows and issue Supabase queries ===

function syncDiff(key: string, prevArr: any[], nextArr: any[]) {
  const table = TABLE_MAP[key];
  if (!table) return;

  const prevIds = new Set(prevArr.map((r) => r.id));
  const nextIds = new Set(nextArr.map((r) => r.id));
  const nextMap = new Map(nextArr.map((r) => [r.id, r]));
  const prevMap = new Map(prevArr.map((r) => [r.id, r]));

  // Added rows
  for (const row of nextArr) {
    if (!prevIds.has(row.id)) {
      supabase.from(table).insert(toSnake(row)).then(({ error }) => {
        if (error) console.warn(`Insert ${table} failed:`, error.message);
      });
    }
  }

  // Deleted rows
  for (const row of prevArr) {
    if (!nextIds.has(row.id)) {
      supabase.from(table).delete().eq('id', row.id).then(({ error }) => {
        if (error) console.warn(`Delete ${table} failed:`, error.message);
      });
    }
  }

  // Updated rows (compare shallow)
  for (const row of nextArr) {
    const old = prevMap.get(row.id);
    if (old && JSON.stringify(old) !== JSON.stringify(row)) {
      const { id, ...patch } = row;
      supabase.from(table).update(toSnake(patch)).eq('id', id).then(({ error }) => {
        if (error) console.warn(`Update ${table} failed:`, error.message);
      });
    }
  }
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
