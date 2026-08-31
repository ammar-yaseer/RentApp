// =============================================================================
// SUPABASE MIGRATION NOTE:
// This entire store layer is a frontend-only prototype using localStorage.
// When migrating to Supabase:
//   1. Replace `load()` with Supabase table queries (one table per Database key)
//   2. Replace `update()` with Supabase insert/update/delete + real-time subscriptions
//   3. Replace `audit()` with a Supabase trigger or RPC on each table
//   4. Replace `nextSeq()` with a Supabase sequence or RPC
//   5. Replace `setSettings()` with a Supabase settings table update
//   6. Replace presence tracking with Supabase presence channels
//   7. Remove ALL localStorage code in this file
//   8. Keep the same `useStore()` API so components don't need changes
// =============================================================================

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Database } from '../types';
import { seedDatabase } from './seed';
import { uid, nowISO } from '../lib/utils';

const STORAGE_KEY = 'rentflow.db.v1';
const PRESENCE_KEY = 'rentflow.presence';
const CURRENT_USER_KEY = 'rentflow.currentUser';

/** Track which user is currently online (frontend-only presence simulation) */
export function getPresence(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PRESENCE_KEY) ?? '{}');
  } catch { return {}; }
}

export function setPresence(userId: string) {
  const presence = getPresence();
  presence[userId] = Date.now();
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(presence));
  localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

/** Check if a user is considered online (active in last 2 minutes) */
export function isUserOnline(userId: string): boolean {
  const presence = getPresence();
  const lastSeen = presence[userId];
  if (!lastSeen) return false;
  return Date.now() - lastSeen < 2 * 60 * 1000; // 2 minutes
}

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Database;
  } catch {
    // ignore
  }
  const seeded = seedDatabase();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    // ignore
  }
  return seeded;
}

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
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => load());
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      } catch {
        // ignore quota errors
      }
    }, 250);
  }, [db]);

  const value = useMemo<StoreContextValue>(() => {
    const audit = (entry: AuditEntry) => {
      setDb((prev) => ({
        ...prev,
        auditLogs: [
          {
            id: uid('al'),
            user: 'admin@rentflow',
            action: entry.action,
            entity: entry.entity,
            entityId: entry.entityId,
            before: entry.before,
            after: entry.after,
            timestamp: nowISO(),
          },
          ...prev.auditLogs,
        ].slice(0, 500),
      }));
    };

    return {
      db,
      update: (key, fn, auditEntry) => {
        setDb((prev) => ({ ...prev, [key]: fn(prev[key]) }));
        if (auditEntry) audit(auditEntry);
      },
      setSettings: (patch) => {
        setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
        audit({ action: 'UPDATE', entity: 'Settings', after: JSON.stringify(patch) });
      },
      resetData: () => {
        const fresh = seedDatabase();
        setDb(fresh);
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
        const prefixKey = `${kind}Prefix` as keyof Database['settings'];
        const seqKey = `${kind}Seq` as keyof Database['settings'];
        const prefix = db.settings[prefixKey] as string;
        const seq = db.settings[seqKey] as number;
        const num = String(seq).padStart(4, '0');
        setDb((prev) => ({
          ...prev,
          settings: { ...prev.settings, [seqKey]: (seq as number) + 1 },
        }));
        return `${prefix}${num}`;
      },
      audit,
    };
  }, [db]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
