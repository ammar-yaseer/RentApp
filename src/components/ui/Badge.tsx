import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Tone = 'gray' | 'green' | 'blue' | 'purple' | 'orange' | 'teal' | 'red' | 'yellow' | 'indigo';

const toneClasses: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  teal: 'bg-teal-100 text-teal-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export function Badge({ tone = 'gray', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('chip', toneClasses[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

// Map common statuses to tones
const statusToneMap: Record<string, Tone> = {
  // vehicle
  Available: 'green', Reserved: 'purple', Rented: 'blue', Inspection: 'yellow',
  Maintenance: 'yellow', Accident: 'red', Repair: 'orange', Inactive: 'gray', Sold: 'gray',
  // booking
  Inquiry: 'gray', Confirmed: 'blue', Active: 'indigo', 'Due Return': 'teal',
  Overdue: 'red', Completed: 'green', Cancelled: 'gray', 'No-show': 'gray',
  // payment
  Pending: 'yellow', 'Partially Paid': 'orange', Paid: 'green', Refunded: 'teal', Failed: 'red', Held: 'blue',
  // customer (Active already mapped above; Blacklisted/Inactive below)
  Blacklisted: 'red',
  // settlement
  Draft: 'gray', 'Pending Approval': 'yellow', Approved: 'blue', Reconciled: 'teal',
  // lease
  Defaulted: 'red',
  // insurance
  Expired: 'red', 'Claim in Progress': 'orange',
  // approval
  Rejected: 'red',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusToneMap[status] ?? 'gray';
  return <Badge tone={tone} dot className={className}>{status}</Badge>;
}
