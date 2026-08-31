import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Car, Edit2, Trash2, ArrowLeft, FileText, History, Camera, X } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups } from '../lib/hooks';
import type { Vehicle, VehicleStatus, VehicleDocument } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { SearchInput } from '../components/ui/Tabs';
import { uid, nowISO, formatCurrency, formatDate, cn } from '../lib/utils';
import { uploadImage } from '../lib/storage';

const STATUSES: VehicleStatus[] = ['Available', 'Reserved', 'Rented', 'Inspection', 'Maintenance', 'Accident', 'Repair', 'Inactive', 'Sold'];

export default function Vehicles() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { db, update, audit } = useStore();
  const lookups = useLookups();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState('all');

  if (id) return <VehicleDetail vehicleId={id} onBack={() => navigate('/vehicles')} />;

  const filtered = db.vehicles
    .filter((v) => !statusFilter || v.status === statusFilter)
    .filter((v) => {
      const q = search.toLowerCase();
      return !q || `${v.make} ${v.model} ${v.regNumber} ${v.color ?? ''}`.toLowerCase().includes(q);
    });

  const counts = {
    all: db.vehicles.length,
    Available: db.vehicles.filter((v) => v.status === 'Available').length,
    Rented: db.vehicles.filter((v) => v.status === 'Rented').length,
    Maintenance: db.vehicles.filter((v) => v.status === 'Maintenance').length,
  };

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={`${db.vehicles.length} vehicles in fleet`}
        actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Vehicle</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search make, model, reg…" className="flex-1" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      <Tabs
        tabs={[
          { key: 'all', label: 'All', count: counts.all },
          { key: 'Available', label: 'Available', count: counts.Available },
          { key: 'Rented', label: 'Rented', count: counts.Rented },
          { key: 'Maintenance', label: 'Maintenance', count: counts.Maintenance },
        ]}
        active={tab}
        onChange={(k) => { setTab(k); setStatusFilter(k === 'all' ? '' : k); }}
      />

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card><EmptyState icon={<Car size={40} />} title="No vehicles found" subtitle="Add your first vehicle to get started" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add Vehicle</Button>} /></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((v) => (
              <Card key={v.id} className="hover:shadow-card-md transition-shadow cursor-pointer overflow-hidden" onClick={() => navigate(`/vehicles/${v.id}`)}>
                {v.photoUrl ? (
                  <div className="relative h-40 -mx-4 -mt-4 mb-3 sm:-mx-5 sm:-mt-5 overflow-hidden bg-slate-100">
                    <img src={v.photoUrl} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute top-2 right-2"><StatusBadge status={v.status} /></div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{v.make} {v.model}</p>
                      <p className="text-sm text-slate-500">{v.regNumber} · {v.year}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                )}
                {v.photoUrl && (
                  <div className="mb-2">
                    <p className="font-semibold text-slate-900 truncate">{v.make} {v.model}</p>
                    <p className="text-sm text-slate-500">{v.regNumber} · {v.year}</p>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Info label="Fuel" value={v.fuelType ?? '—'} />
                  <Info label="Transmission" value={v.transmission ?? '—'} />
                  <Info label="Mileage" value={`${(v.mileage ?? 0).toLocaleString()} km`} />
                  <Info label="Book Value" value={formatCurrency(v.bookValue ?? 0)} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <VehicleForm
          vehicle={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={(v) => {
            if (editing) {
              update('vehicles', (arr) => arr.map((x) => x.id === v.id ? { ...v, updatedAt: nowISO() } : x),
                { action: 'UPDATE', entity: 'Vehicle', entityId: v.id, after: JSON.stringify(v) });
              toast.success('Vehicle Updated', `${v.make} ${v.model} (${v.regNumber})`);
            } else {
              const newV = { ...v, id: uid('vh'), createdAt: nowISO(), updatedAt: nowISO() };
              update('vehicles', (arr) => [newV, ...arr],
                { action: 'CREATE', entity: 'Vehicle', entityId: newV.id, after: JSON.stringify(newV) });
              toast.success('Vehicle Added', `${v.make} ${v.model} (${v.regNumber})`);
            }
            setCreating(false); setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            update('vehicles', (arr) => arr.filter((v) => v.id !== deleteId),
              { action: 'DELETE', entity: 'Vehicle', entityId: deleteId });
          }
        }}
        title="Delete vehicle?"
        message="This will permanently remove the vehicle record. This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="text-slate-700 font-medium truncate">{value}</p>
    </div>
  );
}

function VehicleDetail({ vehicleId, onBack }: { vehicleId: string; onBack: () => void }) {
  const { db, update, audit } = useStore();
  const lookups = useLookups();
  const toast = useToast();
  const vehicle = db.vehicles.find((v) => v.id === vehicleId);
  const [editing, setEditing] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!vehicle) return <EmptyState title="Vehicle not found" action={<Button onClick={onBack}>Back</Button>} />;

  const docs = db.vehicleDocuments.filter((d) => d.vehicleId === vehicleId);
  const bookings = db.bookings.filter((b) => b.vehicleId === vehicleId);
  const maint = db.maintenances.filter((m) => m.vehicleId === vehicleId);
  const ins = db.insurances.find((i) => i.vehicleId === vehicleId);
  const lease = db.leaseContracts.find((l) => l.vehicleId === vehicleId);
  const expenses = db.expenses.filter((e) => e.vehicleId === vehicleId);

  return (
    <div>
      <button className="btn-ghost mb-3 -ml-2" onClick={onBack}><ArrowLeft size={16} /> Back to vehicles</button>
      <PageHeader
        title={`${vehicle.make} ${vehicle.model}`}
        subtitle={`${vehicle.regNumber} · ${vehicle.year}`}
        actions={
          <>
            <Button variant="secondary" icon={<Edit2 size={16} />} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleteOpen(true)}>Delete</Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Vehicle Details" />
          {vehicle.photoUrl && (
            <div className="mb-4 rounded-xl overflow-hidden bg-slate-100">
              <img src={vehicle.photoUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full max-h-72 object-cover" loading="lazy" />
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <DetailRow label="Status" value={<StatusBadge status={vehicle.status} />} />
            <DetailRow label="VIN / Chassis" value={vehicle.vin ?? '—'} />
            <DetailRow label="Engine Number" value={vehicle.engineNumber ?? '—'} />
            <DetailRow label="Color" value={vehicle.color ?? '—'} />
            <DetailRow label="Transmission" value={vehicle.transmission ?? '—'} />
            <DetailRow label="Fuel Type" value={vehicle.fuelType ?? '—'} />
            <DetailRow label="Seating" value={vehicle.seatingCapacity ?? '—'} />
            <DetailRow label="Mileage" value={`${(vehicle.mileage ?? 0).toLocaleString()} km`} />
            <DetailRow label="Purchase Date" value={formatDate(vehicle.purchaseDate)} />
            <DetailRow label="Purchase Price" value={formatCurrency(vehicle.purchasePrice ?? 0)} />
            <DetailRow label="Book Value" value={formatCurrency(vehicle.bookValue ?? 0)} />
            <DetailRow label="Branch" value={lookups.branch(vehicle.branchId)?.name ?? '—'} />
          </div>
          {vehicle.notes && <div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs text-slate-500">Notes</p><p className="text-sm text-slate-700 mt-1">{vehicle.notes}</p></div>}
        </Card>

        <Card>
          <CardHeader title="Quick Stats" />
          <div className="space-y-3 text-sm">
            <DetailRow label="Total Bookings" value={String(bookings.length)} />
            <DetailRow label="Active Lease" value={lease ? `${formatCurrency(lease.outstandingPrincipal)} outstanding` : 'None'} />
            <DetailRow label="Insurance" value={ins ? `Expires ${formatDate(ins.expiryDate)}` : 'None'} />
            <DetailRow label="Maintenance Records" value={String(maint.length)} />
            <DetailRow label="Total Expenses" value={formatCurrency(expenses.reduce((a, e) => a + e.amount, 0))} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Documents" subtitle="Track expiry for registration, insurance, license, emission" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setDocModal(true)}>Add</Button>} />
        {docs.length === 0 ? <EmptyState title="No documents" /> : (
          <DataTable
            columns={[
              { key: 'type', header: 'Type', render: (d: VehicleDocument) => d.type },
              { key: 'reference', header: 'Reference', render: (d) => d.reference ?? '—' },
              { key: 'issue', header: 'Issue Date', render: (d) => formatDate(d.issueDate) },
              { key: 'expiry', header: 'Expiry Date', render: (d) => <span className={cn(new Date(d.expiryDate ?? '') < new Date() && 'text-red-600 font-medium')}>{formatDate(d.expiryDate)}</span> },
              { key: 'actions', header: '', align: 'right', render: (d) => <IconButton icon={<Trash2 size={14} />} label="Delete" onClick={() => setDeleteDocId(d.id)} /> },
            ]}
            rows={docs}
            rowKey={(d) => d.id}
          />
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader title="Rental History" />
        {bookings.length === 0 ? <EmptyState title="No bookings yet" /> : (
          <DataTable
            columns={[
              { key: 'number', header: 'Booking', render: (b) => <Link to={`/bookings/${b.id}`} className="text-brand-600 hover:underline">{b.number}</Link> },
              { key: 'customer', header: 'Customer', render: (b) => lookups.customerLabel(b.customerId) },
              { key: 'pickup', header: 'Pickup', render: (b) => formatDate(b.pickupAt) },
              { key: 'return', header: 'Return', render: (b) => formatDate(b.returnAt) },
              { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
            ]}
            rows={bookings}
            rowKey={(b) => b.id}
            onRowClick={(b) => window.location.assign(`/bookings/${b.id}`)}
          />
        )}
      </Card>

      {editing && (
        <VehicleForm vehicle={vehicle} onClose={() => setEditing(false)} onSave={(v) => {
          update('vehicles', (arr) => arr.map((x) => x.id === v.id ? { ...v, updatedAt: nowISO() } : x),
            { action: 'UPDATE', entity: 'Vehicle', entityId: v.id, after: JSON.stringify(v) });
          setEditing(false);
        }} />
      )}

      {docModal && <DocForm vehicleId={vehicleId} onClose={() => setDocModal(false)} onSave={(d) => {
        const newD = { ...d, id: uid('vd'), createdAt: nowISO() };
        update('vehicleDocuments', (arr) => [newD, ...arr], { action: 'CREATE', entity: 'VehicleDocument', entityId: newD.id });
        setDocModal(false);
      }} />}

      <ConfirmDialog open={!!deleteDocId} onClose={() => setDeleteDocId(null)} onConfirm={() => {
        if (deleteDocId) update('vehicleDocuments', (arr) => arr.filter((d) => d.id !== deleteDocId), { action: 'DELETE', entity: 'VehicleDocument', entityId: deleteDocId });
      }} title="Delete document?" message="Remove this document record?" confirmLabel="Delete" danger />

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => {
        update('vehicles', (arr) => arr.filter((v) => v.id !== vehicleId), { action: 'DELETE', entity: 'Vehicle', entityId: vehicleId });
        toast.success('Vehicle Deleted', `${vehicle.make} ${vehicle.model} (${vehicle.regNumber})`);
        setDeleteOpen(false);
        onBack();
      }} title="Delete vehicle?" message={`Permanently remove ${vehicle.make} ${vehicle.model} (${vehicle.regNumber})? This cannot be undone.`} confirmLabel="Delete" danger />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium text-right">{value}</span>
    </div>
  );
}

function VehicleForm({ vehicle, onClose, onSave }: { vehicle: Vehicle | null; onClose: () => void; onSave: (v: Vehicle) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Partial<Vehicle>>(vehicle ?? { status: 'Available', mileage: 0, year: new Date().getFullYear() });
  const set = (k: keyof Vehicle, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage('vehicle-photos', `${form.id ?? uid('vh')}.jpg`, file);
      set('photoUrl', url);
    } catch (err: any) {
      toast.error('Upload Failed', err?.message ?? 'Could not upload photo');
    }
  };

  return (
    <Modal open onClose={onClose} title={vehicle ? 'Edit Vehicle' : 'Add Vehicle'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as Vehicle)}>Save</Button></>}>
      {/* Vehicle Photo Upload */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">Vehicle Photo</p>
        <div className="flex items-start gap-3">
          {form.photoUrl ? (
            <div className="relative group">
              <img src={form.photoUrl} alt="Vehicle" className="w-32 h-24 object-cover rounded-lg border border-slate-200" />
              <button type="button" onClick={() => set('photoUrl', undefined)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"><X size={12} /></button>
            </div>
          ) : (
            <div className="w-32 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
              <Car size={32} />
            </div>
          )}
          <label className="btn-secondary cursor-pointer text-sm">
            <Camera size={16} /> Upload Photo
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Make" required><Input value={form.make ?? ''} onChange={(e) => set('make', e.target.value)} placeholder="Toyota" /></Field>
        <Field label="Model" required><Input value={form.model ?? ''} onChange={(e) => set('model', e.target.value)} placeholder="Aqua" /></Field>
        <Field label="Registration Number" required><Input value={form.regNumber ?? ''} onChange={(e) => set('regNumber', e.target.value)} placeholder="CAR-1234" /></Field>
        <Field label="Year"><Input type="number" value={form.year ?? ''} onChange={(e) => set('year', +e.target.value)} /></Field>
        <Field label="VIN / Chassis"><Input value={form.vin ?? ''} onChange={(e) => set('vin', e.target.value)} /></Field>
        <Field label="Engine Number"><Input value={form.engineNumber ?? ''} onChange={(e) => set('engineNumber', e.target.value)} /></Field>
        <Field label="Color"><Input value={form.color ?? ''} onChange={(e) => set('color', e.target.value)} /></Field>
        <Field label="Transmission"><Select value={form.transmission ?? ''} onChange={(e) => set('transmission', e.target.value)}><option value="">—</option><option>Manual</option><option>Auto</option><option>CVT</option></Select></Field>
        <Field label="Fuel Type"><Select value={form.fuelType ?? ''} onChange={(e) => set('fuelType', e.target.value)}><option value="">—</option><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option><option>CNG</option></Select></Field>
        <Field label="Seating Capacity"><Input type="number" value={form.seatingCapacity ?? ''} onChange={(e) => set('seatingCapacity', +e.target.value)} /></Field>
        <Field label="Mileage (km)"><Input type="number" value={form.mileage ?? ''} onChange={(e) => set('mileage', +e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status ?? 'Available'} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Purchase Date"><Input type="date" value={form.purchaseDate ? form.purchaseDate.slice(0, 10) : ''} onChange={(e) => set('purchaseDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        <Field label="Purchase Price"><Input type="number" value={form.purchasePrice ?? ''} onChange={(e) => set('purchasePrice', +e.target.value)} /></Field>
        <Field label="Book Value"><Input type="number" value={form.bookValue ?? ''} onChange={(e) => set('bookValue', +e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function DocForm({ vehicleId, onClose, onSave }: { vehicleId: string; onClose: () => void; onSave: (d: Omit<VehicleDocument, 'id' | 'createdAt'>) => void }) {
  const [form, setForm] = useState<Partial<VehicleDocument>>({ vehicleId, type: 'Insurance' });
  const set = (k: keyof VehicleDocument, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title="Add Document" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(form as any)}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="Type" required><Select value={form.type} onChange={(e) => set('type', e.target.value)}><option>Registration</option><option>Insurance</option><option>Revenue License</option><option>Emission</option><option>Lease</option><option>Other</option></Select></Field>
        <Field label="Reference"><Input value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} /></Field>
        <Field label="Issue Date"><Input type="date" value={form.issueDate ? form.issueDate.slice(0, 10) : ''} onChange={(e) => set('issueDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        <Field label="Expiry Date"><Input type="date" value={form.expiryDate ? form.expiryDate.slice(0, 10) : ''} onChange={(e) => set('expiryDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
