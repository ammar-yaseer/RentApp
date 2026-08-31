import { useState, useMemo, useRef, useEffect } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isSameMonth, isToday as isTodayFn,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DateRange {
  start: Date;
  end: Date;
}

interface DatePickerProps {
  value: string; // ISO datetime string
  onChange: (iso: string) => void;
  disabledRanges?: DateRange[]; // booked date ranges to gray out
  placeholder?: string;
}

/**
 * A datetime picker that shows a monthly calendar with booked dates grayed out.
 * Replaces native <input type="datetime-local"> which can't disable individual dates.
 */
export function DatePicker({ value, onChange, disabledRanges = [], placeholder = 'Select date & time' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCaret] = useState(() => (value ? new Date(value) : new Date()));
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedDate = value ? new Date(value) : null;
  const timeValue = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`
    : '09:00';

  // Check if a day falls within any disabled range
  const isDateDisabled = useMemo(() => {
    return (day: Date) => {
      return disabledRanges.some((r) => {
        const rStart = new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate());
        const rEnd = new Date(r.end.getFullYear(), r.end.getMonth(), r.end.getDate());
        const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        return d >= rStart && d <= rEnd;
      });
    };
  }, [disabledRanges]);

  const handleSelectDay = (day: Date) => {
    if (isDateDisabled(day)) return;
    const [h, m] = timeValue.split(':').map(Number);
    const newDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 9, m || 0, 0, 0);
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const base = selectedDate ?? new Date();
    const newDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
    onChange(newDate.toISOString());
  };

  // Build calendar grid
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const displayValue = selectedDate
    ? format(selectedDate, 'dd MMM yyyy, HH:mm')
    : placeholder;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn('input flex items-center justify-between text-left cursor-pointer', !selectedDate && 'text-slate-400')}
      >
        <span>{displayValue}</span>
        <CalIcon size={16} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-3 w-[320px] left-0">
          {/* Calendar nav */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="btn-ghost !p-1.5" onClick={() => setCaret((c) => subMonths(c, 1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-slate-900">{format(cursor, 'MMMM yyyy')}</span>
            <button type="button" className="btn-ghost !p-1.5" onClick={() => setCaret((c) => addMonths(c, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const inMonth = isSameMonth(d, cursor);
              const today = isTodayFn(d);
              const isSelected = selectedDate && isSameDay(d, selectedDate);
              const disabled = isDateDisabled(d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDay(d)}
                  className={cn(
                    'aspect-square rounded text-xs font-medium transition-colors flex items-center justify-center',
                    !inMonth && 'text-slate-300',
                    inMonth && !disabled && !isSelected && 'text-slate-700 hover:bg-brand-50',
                    today && !isSelected && 'ring-1 ring-brand-300',
                    isSelected && 'bg-brand-600 text-white hover:bg-brand-600',
                    disabled && 'bg-slate-100 text-slate-300 cursor-not-allowed line-through',
                  )}
                  title={disabled ? 'Booked — not available' : format(d, 'dd MMM yyyy')}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          {/* Time selector */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Time:</label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="input !py-1 !px-2 text-sm !w-auto"
            />
            <button
              type="button"
              className="btn-secondary btn-sm ml-auto"
              onClick={() => {
                setCaret(new Date());
                if (!selectedDate) {
                  const now = new Date();
                  handleSelectDay(now);
                }
              }}
            >
              Today
            </button>
          </div>

          {/* Legend */}
          {disabledRanges.length > 0 && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Booked</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600" /> Selected</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
