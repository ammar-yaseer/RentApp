import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useStore } from '../data/store';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, EmptyState } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { SearchInput } from '../components/ui/Tabs';
import { formatDateTime } from '../lib/utils';

export default function Audit() {
  const { db } = useStore();
  const [search, setSearch] = useState('');

  const filtered = db.auditLogs.filter((l) => {
    const q = search.toLowerCase();
    return !q || `${l.user} ${l.action} ${l.entity} ${l.entityId ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Immutable record of all system changes" />

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search by user, action, entity…" className="max-w-sm" /></div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<ScrollText size={40} />} title="No audit logs" /></Card>
      ) : (
        <Card padded={false}>
          <DataTable
            columns={[
              { key: 'timestamp', header: 'Timestamp', render: (l) => formatDateTime(l.timestamp) },
              { key: 'user', header: 'User', render: (l) => <span className="font-medium">{l.user}</span> },
              { key: 'action', header: 'Action', render: (l) => <span className="chip bg-slate-100 text-slate-700">{l.action}</span> },
              { key: 'entity', header: 'Entity', render: (l) => l.entity },
              { key: 'entityId', header: 'Entity ID', render: (l) => <span className="text-xs text-slate-500 font-mono">{l.entityId ?? '—'}</span> },
              { key: 'after', header: 'Change', render: (l) => <span className="text-xs text-slate-600">{l.after ?? l.before ?? '—'}</span> },
            ]}
            rows={filtered}
            rowKey={(l) => l.id}
          />
        </Card>
      )}
    </div>
  );
}
