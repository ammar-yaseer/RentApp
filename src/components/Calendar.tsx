import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  addDays, addMonths, addWeeks, startOfMonth, endOfMonth, startOfWeek,
  endOfWeek, eachDayOfInterval, format, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import { cn, formatTime } from '../lib/utils';

export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  to: string;
}

interface CalendarProps {
  view: 'month' | 'week' | 'day' | 'agenda';
  events: CalEvent[];
  colors: Record<string, string>;
}

export function Calendar({ view, events, colors }: CalendarProps) {
  const [cursor, setCursor] = useState(new Date());

  const goToToday = () => setCursor(new Date());
  const prev = () => {
    if (view === 'month') setCursor(addMonths(cursor, -1));
    else if (view === 'week') setCursor(addWeeks(cursor, -1));
    else setCursor(addDays(cursor, -1));
  };
  const next = () => {
    if (view === 'month') setCursor(addMonths(cursor, 1));
    else if (view === 'week') setCursor(addWeeks(cursor, 1));
    else setCursor(addDays(cursor, 1));
  };

  const eventsForDay = useMemo(() => (day: Date) => {
    return events.filter((e) => {
      const s = new Date(e.start);
      const en = new Date(e.end);
      return day >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) && day <= new Date(en.getFullYear(), en.getMonth(), en.getDate());
    });
  }, [events]);

  if (view === 'agenda') return <AgendaView events={events} colors={colors} />;

  if (view === 'day') {
    const dayEvents = eventsForDay(cursor).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return (
      <div>
        <CalendarNav cursor={cursor} prev={prev} next={next} today={goToToday} formatStr="EEEE, d MMM yyyy" />
        <div className="mt-3 space-y-2">
          {dayEvents.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No events for this day</p>
          ) : dayEvents.map((e) => <EventRow key={e.id} event={e} colors={colors} />)}
        </div>
      </div>
    );
  }

  if (view === 'week') {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    const end = endOfWeek(cursor, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return (
      <div>
        <CalendarNav cursor={cursor} prev={prev} next={next} today={goToToday} formatStr="d MMM yyyy" />
        <div className="mt-3 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const dayEvs = eventsForDay(d);
            return (
              <div key={d.toISOString()} className={cn('min-h-[120px] rounded-lg border p-1.5', isToday(d) ? 'border-brand-400 bg-brand-50/30' : 'border-slate-200')}>
                <p className={cn('text-xs font-semibold mb-1', isToday(d) ? 'text-brand-700' : 'text-slate-600')}>{format(d, 'EEE d')}</p>
                <div className="space-y-1">
                  {dayEvs.slice(0, 3).map((e) => <EventDot key={e.id} event={e} colors={colors} />)}
                  {dayEvs.length > 3 && <p className="text-[10px] text-slate-400">+{dayEvs.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // month
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <CalendarNav cursor={cursor} prev={prev} next={next} today={goToToday} formatStr="MMMM yyyy" />
      <div className="mt-3 grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">
            <span className="sm:hidden">{['M','T','W','T','F','S','S'][i]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
        {days.map((d) => {
          const dayEvs = eventsForDay(d);
          const inMonth = isSameMonth(d, cursor);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'min-h-[70px] sm:min-h-[100px] rounded-lg border p-1 sm:p-1.5 transition-colors overflow-hidden',
                isToday(d) ? 'border-brand-400 bg-brand-50/30' : 'border-slate-200',
                !inMonth && 'bg-slate-50/50 text-slate-400',
              )}
            >
              <p className={cn('text-xs font-medium mb-1', isToday(d) ? 'text-brand-700' : inMonth ? 'text-slate-700' : 'text-slate-400')}>
                {format(d, 'd')}
              </p>
              <div className="space-y-0.5">
                {dayEvs.slice(0, 3).map((e) => <EventDot key={e.id} event={e} colors={colors} />)}
                {dayEvs.length > 3 && <p className="text-[10px] text-slate-400">+{dayEvs.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarNav({ cursor, prev, next, today, formatStr }: { cursor: Date; prev: () => void; next: () => void; today: () => void; formatStr: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-base font-semibold text-slate-900">{format(cursor, formatStr)}</h3>
      <div className="flex items-center gap-1">
        <button className="btn-ghost btn-sm" onClick={today}>Today</button>
        <button className="btn-ghost !p-1.5" onClick={prev} aria-label="Previous"><ChevronLeft size={18} /></button>
        <button className="btn-ghost !p-1.5" onClick={next} aria-label="Next"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

function EventDot({ event, colors }: { event: CalEvent; colors: Record<string, string> }) {
  const color = colors[event.status] ?? '#6b7280';
  return (
    <Link
      to={event.to}
      className="block text-[10px] sm:text-[11px] rounded px-1.5 py-0.5 truncate hover:opacity-80"
      style={{ backgroundColor: `${color}20`, color, borderLeft: `2px solid ${color}` }}
      title={`${event.title} · ${formatTime(event.start)} - ${formatTime(event.end)}`}
    >
      <span className="font-medium">{formatTime(event.start)}</span> <span className="truncate">{event.title}</span>
    </Link>
  );
}

function EventRow({ event, colors }: { event: CalEvent; colors: Record<string, string> }) {
  const color = colors[event.status] ?? '#6b7280';
  return (
    <Link
      to={event.to}
      className="flex items-center gap-3 p-2.5 rounded-lg border hover:shadow-card transition-shadow"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      <div className="text-xs text-slate-500 w-24 shrink-0">
        {formatTime(event.start)} - {formatTime(event.end)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
      </div>
      <span className="chip text-xs" style={{ backgroundColor: `${color}20`, color }}>{event.status}</span>
    </Link>
  );
}

function AgendaView({ events, colors }: { events: CalEvent[]; colors: Record<string, string> }) {
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const upcoming = sorted.filter((e) => new Date(e.end) >= new Date());
  const past = sorted.filter((e) => new Date(e.end) < new Date()).reverse();

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Upcoming</h4>
        {upcoming.length === 0 ? <p className="text-sm text-slate-400">No upcoming events</p> : (
          <div className="space-y-2">{upcoming.map((e) => <EventRow key={e.id} event={e} colors={colors} />)}</div>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Past</h4>
          <div className="space-y-2">{past.slice(0, 10).map((e) => <EventRow key={e.id} event={e} colors={colors} />)}</div>
        </div>
      )}
    </div>
  );
}
