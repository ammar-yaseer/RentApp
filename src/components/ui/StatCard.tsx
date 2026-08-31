import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'green' | 'red' | 'blue' | 'amber' | 'indigo';
  onClick?: () => void;
}

const toneIconBg: Record<string, string> = {
  default: 'bg-slate-100 text-slate-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

export function StatCard({ label, value, hint, icon, tone = 'default', onClick }: StatCardProps) {
  return (
    <div
      className={cn('card card-pad', onClick && 'cursor-pointer hover:shadow-card-md transition-shadow')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 truncate">{value}</p>
          {hint && <p className="text-xs text-slate-400 mt-1 truncate">{hint}</p>}
        </div>
        {icon && <div className={cn('rounded-lg p-2 shrink-0', toneIconBg[tone])}>{icon}</div>}
      </div>
    </div>
  );
}
