import { useState } from 'react';
import { Bell, Check, Trash2, Plus, Mail, MessageSquare, Smartphone, Bell as BellIcon } from 'lucide-react';
import { useStore } from '../data/store';
import type { Notification, NotificationChannel } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Tabs, SearchInput } from '../components/ui/Tabs';
import { StatCard } from '../components/ui/StatCard';
import { uid, nowISO, formatDateTime, cn } from '../lib/utils';

const CHANNELS: NotificationChannel[] = ['Popup', 'Email', 'SMS', 'Push', 'WhatsApp'];
const channelIcon = (c: NotificationChannel) => {
  if (c === 'Email') return <Mail size={14} />;
  if (c === 'SMS') return <MessageSquare size={14} />;
  if (c === 'Push') return <Smartphone size={14} />;
  return <BellIcon size={14} />;
};

export default function Notifications() {
  const { db, update } = useStore();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [creating, setCreating] = useState(false);

  const filtered = db.notifications
    .filter((n) => tab === 'all' || (tab === 'unread' ? !n.read : n.status === tab))
    .filter((n) => {
      const q = search.toLowerCase();
      return !q || `${n.subject} ${n.message} ${n.type}`.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = db.notifications.filter((n) => !n.read).length;
  const pending = db.notifications.filter((n) => n.status === 'Pending').length;
  const failed = db.notifications.filter((n) => n.status === 'Failed').length;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Alerts, reminders, and notification history" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>New Notification</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Unread" value={unread} icon={<Bell size={18} />} tone="amber" />
        <StatCard label="Pending" value={pending} icon={<Bell size={18} />} />
        <StatCard label="Failed" value={failed} icon={<Bell size={18} />} tone="red" />
        <StatCard label="Total" value={db.notifications.length} icon={<Bell size={18} />} />
      </div>

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search notifications…" className="max-w-sm" /></div>
      <Tabs tabs={[
        { key: 'all', label: 'All', count: db.notifications.length },
        { key: 'unread', label: 'Unread', count: unread },
        { key: 'Pending', label: 'Pending', count: pending },
        { key: 'Sent', label: 'Sent', count: db.notifications.filter((n) => n.status === 'Sent' || n.status === 'Read').length },
      ]} active={tab} onChange={setTab} />

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card><EmptyState icon={<Bell size={40} />} title="No notifications" /></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <Card key={n.id} className={cn('card-pad', !n.read && 'border-brand-300 bg-brand-50/30')}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-slate-400">{channelIcon(n.channel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">{n.subject}</p>
                      <StatusBadge status={n.status} />
                      <span className="text-xs text-slate-400">{n.type}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.createdAt)} · {n.channel}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.read && <IconButton icon={<Check size={14} />} label="Mark read" onClick={() => update('notifications', (arr) => arr.map((x) => x.id === n.id ? { ...x, read: true, status: 'Read' } : x))} />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {creating && <NotifForm onClose={() => setCreating(false)} onSave={(n) => {
        const newN: Notification = { ...n, id: uid('nt'), status: 'Pending', createdAt: nowISO() };
        update('notifications', (arr) => [newN, ...arr], { action: 'CREATE', entity: 'Notification', entityId: newN.id });
        setCreating(false);
      }} />}
    </div>
  );
}

function NotifForm({ onClose, onSave }: { onClose: () => void; onSave: (n: Omit<Notification, 'id' | 'status' | 'createdAt'>) => void }) {
  const [form, setForm] = useState<Partial<Notification>>({ channel: 'Popup', type: 'Custom', scheduledAt: nowISO() });
  const set = (k: keyof Notification, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title="New Notification"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as any)}>Schedule</Button></>}>
      <div className="space-y-3">
        <Field label="Type"><Input value={form.type ?? ''} onChange={(e) => set('type', e.target.value)} /></Field>
        <Field label="Channel"><Select value={form.channel ?? 'Popup'} onChange={(e) => set('channel', e.target.value as NotificationChannel)}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Recipient"><Input value={form.recipient ?? ''} onChange={(e) => set('recipient', e.target.value)} /></Field>
        <Field label="Subject" required><Input value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} /></Field>
        <Field label="Message" required><Textarea value={form.message ?? ''} onChange={(e) => set('message', e.target.value)} /></Field>
        <Field label="Schedule For"><Input type="datetime-local" value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ''} onChange={(e) => set('scheduledAt', e.target.value ? new Date(e.target.value).toISOString() : nowISO())} /></Field>
      </div>
    </Modal>
  );
}
