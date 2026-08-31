import { useState, useEffect, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: ReactNode; count?: number }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'relative px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
            active === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn('ml-1.5 text-xs rounded-full px-1.5 py-0.5', active === t.key ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  // Debounce search input to avoid filtering on every keystroke (performance)
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    const t = setTimeout(() => { if (local !== value) onChange(local); }, 250);
    return () => clearTimeout(t);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="search"
        className="input pl-9"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}

export function useTabs(defaultKey: string) {
  const [active, setActive] = useState(defaultKey);
  return { active, setActive };
}
