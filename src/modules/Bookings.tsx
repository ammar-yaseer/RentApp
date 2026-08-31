import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, CalendarDays, Edit2, ArrowLeft, AlertTriangle, ClipboardCheck, CheckCircle2, X, CalendarPlus, Download } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../components/Toast';
import { useLookups, useBookingConflicts, useVehicleBookedDates } from '../lib/hooks';
import type { Booking, BookingStatus, Inspection } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Form';
import { DatePicker } from '../components/ui/DatePicker';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Tabs, SearchInput } from '../components/ui/Tabs';
import { uid, nowISO, formatCurrency, formatDateTime, daysBetween, isOverdue, cn, compressImage, downloadFile } from '../lib/utils';
import { bookingToEvent, googleCalendarUrl, eventToICS } from '../lib/googleCalendar';

const STATUSES: BookingStatus[] = ['Inquiry', 'Reserved', 'Confirmed', 'Active', 'Due Return', 'Overdue', 'Completed', 'Cancelled', 'No-show'];

export default function Bookings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { db, nextSeq, update } = useStore();
  const lookups = useLookups();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [creating, setCreating] = useState(false);

  if (id) return <BookingDetail bookingId={id} onBack={() => navigate('/bookings')} />;

  const filtered = db.bookings
    .filter((b) => {
      // 'all' = active bookings only (excludes Completed/Cancelled/No-show which have their own tabs)
      if (tab === 'all') return !['Completed', 'Cancelled', 'No-show'].includes(b.status);
      return b.status === tab;
    })
    .filter((b) => {
      const q = search.toLowerCase();
      return !q || `${b.number} ${lookups.customerLabel(b.customerId)} ${lookups.vehicleLabel(b.vehicleId)}`.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.pickupAt).getTime() - new Date(a.pickupAt).getTime());

  return (
    <div>
      <PageHeader title="Bookings" subtitle={`${db.bookings.length} bookings`} actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>New Booking</Button>} />
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search booking #, customer, vehicle…" className="flex-1" />
      </div>
      <Tabs tabs={[
        { key: 'all', label: 'Active', count: db.bookings.filter((b) => !['Completed', 'Cancelled', 'No-show'].includes(b.status)).length },
        { key: 'Active', label: 'On Rent', count: db.bookings.filter((b) => b.status === 'Active').length },
        { key: 'Overdue', label: 'Overdue', count: db.bookings.filter((b) => b.status === 'Overdue' || isOverdue(b.returnAt, b.status)).length },
        { key: 'Confirmed', label: 'Upcoming', count: db.bookings.filter((b) => ['Confirmed', 'Reserved'].includes(b.status)).length },
        { key: 'Completed', label: 'Completed', count: db.bookings.filter((b) => b.status === 'Completed').length },
        { key: 'Cancelled', label: 'Cancelled', count: db.bookings.filter((b) => ['Cancelled', 'No-show'].includes(b.status)).length },
      ]} active={tab} onChange={setTab} />

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card><EmptyState icon={<CalendarDays size={40} />} title="No bookings found" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>New Booking</Button>} /></Card>
        ) : (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'number', header: 'Booking', render: (b) => <Link to={`/bookings/${b.id}`} className="text-brand-600 hover:underline font-medium">{b.number}</Link> },
                { key: 'type', header: 'Type', render: (b) => <span className={cn('chip text-xs', b.rentalType === 'Hire' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>{b.rentalType}</span> },
                { key: 'customer', header: 'Customer', render: (b) => <span className="truncate block max-w-[160px]">{lookups.customerLabel(b.customerId)}</span> },
                { key: 'vehicle', header: 'Vehicle', render: (b) => <span className="truncate block max-w-[160px]">{lookups.vehicleLabel(b.vehicleId)}</span> },
                { key: 'pickup', header: 'Pickup', render: (b) => formatDateTime(b.pickupAt) },
                { key: 'return', header: 'Return', render: (b) => formatDateTime(b.returnAt) },
                { key: 'total', header: 'Total', align: 'right', render: (b) => formatCurrency(b.rentalDays * b.dailyRate + (b.additionalCharges ?? 0) - (b.discount ?? 0)) },
                { key: 'status', header: 'Status', render: (b) => <StatusBadge status={isOverdue(b.returnAt, b.status) ? 'Overdue' : b.status} /> },
              ]}
              rows={filtered}
              rowKey={(b) => b.id}
              onRowClick={(b) => navigate(`/bookings/${b.id}`)}
            />
          </Card>
        )}
      </div>

      {creating && (
        <BookingForm
          booking={null}
          onClose={() => setCreating(false)}
          onSave={(b) => {
            const number = nextSeq('booking');
            const newB = { ...b, id: uid('bk'), number, createdAt: nowISO(), updatedAt: nowISO() } as Booking;
            update('bookings', (arr) => [newB, ...arr], { action: 'CREATE', entity: 'Booking', entityId: newB.id });
            // Auto-create advance payment record so "Advance Paid" shows correctly on vehicle return
            if (b.deposit > 0) {
              const payNumber = nextSeq('payment');
              update('payments', (arr) => [{
                id: uid('pay'), number: payNumber, bookingId: newB.id, customerId: b.customerId,
                amount: b.deposit, date: nowISO(), method: 'Cash', status: 'Paid',
                notes: 'Advance payment at booking', createdAt: nowISO(),
              }, ...arr], { action: 'CREATE', entity: 'Payment', entityId: payNumber });
            }
            // Create notification + toast
            update('notifications', (arr) => [{
              id: uid('nt'), type: 'Booking Created', channel: 'Popup',
              subject: `New Booking ${number}`,
              message: `${b.rentalType} booking for ${lookups.vehicleLabel(b.vehicleId)} · ${formatDateTime(b.pickupAt)}`,
              scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO(),
            }, ...arr]);
            toast.success('Booking Created', `${number} — ${b.rentalType} · ${lookups.vehicleLabel(b.vehicleId)}`);
            // Google Calendar sync prompt
            if (db.settings.googleCalendarSync && db.settings.googleCalendarEmail) {
              const calUrl = googleCalendarUrl(bookingToEvent(newB, lookups.vehicleLabel(b.vehicleId), lookups.customerLabel(b.customerId)));
              toast.info('Add to Google Calendar', 'Click to save this booking to your Google Calendar — opening in new tab');
              setTimeout(() => window.open(calUrl, '_blank'), 1000);
            }
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function BookingDetail({ bookingId, onBack }: { bookingId: string; onBack: () => void }) {
  const { db, update, nextSeq } = useStore();
  const lookups = useLookups();
  const toast = useToast();
  const booking = db.bookings.find((b) => b.id === bookingId);
  const [editing, setEditing] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  if (!booking) return <EmptyState title="Booking not found" action={<Button onClick={onBack}>Back</Button>} />;

  const vehicle = lookups.vehicle(booking.vehicleId);
  const customer = lookups.customer(booking.customerId);
  const driver = lookups.driver(booking.driverId);
  const inspections = db.inspections.filter((i) => i.bookingId === bookingId);
  const payments = db.payments.filter((p) => p.bookingId === bookingId);
  const deposit = db.deposits.find((d) => d.bookingId === bookingId);
  const docs = db.documents.filter((d) => d.bookingId === bookingId);

  const subtotal = booking.rentalDays * booking.dailyRate + (booking.extraKmCharge ?? 0) + (booking.additionalCharges ?? 0) - (booking.discount ?? 0);
  const taxAmount = subtotal * ((booking.taxRate ?? 0) / 100);
  const total = subtotal + taxAmount;
  const paid = payments.filter((p) => !p.isDeposit && p.status === 'Paid').reduce((a, p) => a + p.amount, 0);
  const balance = total - paid;

  const canHandover = ['Confirmed', 'Reserved'].includes(booking.status);
  const canReturn = ['Active', 'Due Return', 'Overdue'].includes(booking.status);

  return (
    <div>
      <button className="btn-ghost mb-3 -ml-2" onClick={onBack}><ArrowLeft size={16} /> Back to bookings</button>
      <PageHeader title={booking.number} subtitle={`${lookups.customerLabel(booking.customerId)} · ${lookups.vehicleLabel(booking.vehicleId)}`}
        actions={<>
          <Button variant="secondary" icon={<Edit2 size={16} />} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="secondary" onClick={() => setStatusModal(true)}>Change Status</Button>
          <a href={googleCalendarUrl(bookingToEvent(booking, lookups.vehicleLabel(booking.vehicleId), lookups.customerLabel(booking.customerId)))} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
            <CalendarPlus size={16} /> Google Calendar
          </a>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => downloadFile(`booking-${booking.number}.ics`, eventToICS(bookingToEvent(booking, lookups.vehicleLabel(booking.vehicleId), lookups.customerLabel(booking.customerId))), 'text/calendar')}>.ics</Button>
        </>} />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Booking Details" action={<StatusBadge status={isOverdue(booking.returnAt, booking.status) ? 'Overdue' : booking.status} />} />
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Row label="Rental Type" value={<StatusBadge status={booking.rentalType} />} />
            <Row label="Customer" value={<Link to={`/customers/${booking.customerId}`} className="text-brand-600 hover:underline">{lookups.customerLabel(booking.customerId)}</Link>} />
            <Row label="Vehicle" value={<Link to={`/vehicles/${booking.vehicleId}`} className="text-brand-600 hover:underline">{lookups.vehicleLabel(booking.vehicleId)}</Link>} />
            <Row label="Driver" value={driver ? driver.fullName : '—'} />
            <Row label="Pickup" value={formatDateTime(booking.pickupAt)} />
            <Row label="Return" value={formatDateTime(booking.returnAt)} />
            <Row label="Rental Days" value={String(booking.rentalDays)} />
            <Row label="Pickup Location" value={booking.pickupLocation ?? '—'} />
            <Row label="Return Location" value={booking.returnLocation ?? '—'} />
            <Row label="Daily Rate" value={formatCurrency(booking.dailyRate)} />
            <Row label="Extra KM Rate" value={booking.extraKmRate ? formatCurrency(booking.extraKmRate) + '/km' : '—'} />
            <Row label="Included KM" value={booking.includedKm ? `${booking.includedKm} km` : '—'} />
            <Row label="Fuel Policy" value={booking.fuelPolicy ?? '—'} />
            <Row label="Advance Payment" value={formatCurrency(booking.deposit)} />
            <Row label="Discount" value={booking.discount ? formatCurrency(booking.discount) : '—'} />
            <Row label="Tax Rate" value={`${booking.taxRate ?? 0}%`} />
            <Row label="Pickup Odometer" value={booking.pickupOdometer ? `${booking.pickupOdometer.toLocaleString()} km` : '—'} />
            <Row label="Return Odometer" value={booking.returnOdometer ? `${booking.returnOdometer.toLocaleString()} km` : '—'} />
            <Row label="KM Used" value={booking.kmUsed != null ? `${booking.kmUsed.toLocaleString()} km` : '—'} />
            <Row label="Extra KM" value={booking.extraKm != null ? `${booking.extraKm.toLocaleString()} km` : '—'} />
          </div>

          {/* Odometer photos */}
          {(booking.odometerPhotoOut || booking.odometerPhotoIn) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Meter Photos</p>
              <div className="flex gap-3">
                {booking.odometerPhotoOut && <div><img src={booking.odometerPhotoOut} alt="Pickup meter" className="rounded-lg max-h-32 object-cover border border-slate-200" /><p className="text-xs text-slate-500 mt-1 text-center">Pickup</p></div>}
                {booking.odometerPhotoIn && <div><img src={booking.odometerPhotoIn} alt="Return meter" className="rounded-lg max-h-32 object-cover border border-slate-200" /><p className="text-xs text-slate-500 mt-1 text-center">Return</p></div>}
              </div>
            </div>
          )}

          {/* Customer documents */}
          {booking.customerDocuments && booking.customerDocuments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Customer Documents</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {booking.customerDocuments.map((doc) => (
                  <a key={doc.id} href={doc.dataUrl} target="_blank" rel="noreferrer" className="block">
                    {doc.dataUrl.startsWith('data:image') ? (
                      <img src={doc.dataUrl} alt={doc.name} className="w-full h-16 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <div className="w-full h-16 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-500 bg-white">PDF</div>
                    )}
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{doc.name}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
          {booking.notes && <div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs text-slate-500">Notes</p><p className="text-sm text-slate-700 mt-1">{booking.notes}</p></div>}
        </Card>

        <Card>
          <CardHeader title="Charges" />
          <div className="space-y-2 text-sm">
            <Line label="Rental Base" value={formatCurrency(booking.rentalDays * booking.dailyRate)} />
            {booking.extraKmCharge ? <Line label={`Extra KM (${booking.extraKm} km × ${formatCurrency(booking.extraKmRate ?? 0)}/km)`} value={formatCurrency(booking.extraKmCharge)} /> : null}
            {booking.additionalCharges ? <Line label="Additional" value={formatCurrency(booking.additionalCharges)} /> : null}
            {booking.discount ? <Line label="Discount" value={`- ${formatCurrency(booking.discount)}`} /> : null}
            {taxAmount > 0 && <Line label={`Tax (${booking.taxRate}%)`} value={formatCurrency(taxAmount)} />}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
            <Line label="Paid" value={formatCurrency(paid)} />
            <div className={cn('flex justify-between font-semibold', balance > 0 ? 'text-red-600' : 'text-green-600')}><span>Balance</span><span>{formatCurrency(balance)}</span></div>
          </div>
          {balance > 0 && <Button className="w-full mt-3" size="sm" onClick={() => window.location.assign('/payments')}>Record Payment</Button>}
        </Card>
      </div>

      {/* Action buttons */}
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <Card>
          <CardHeader title="Vehicle Handover" subtitle="Record pre-rental inspection" />
          {inspections.some((i) => i.type === 'Handover') ? (
            <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 size={16} /> Handover completed on {formatDateTime(inspections.find((i) => i.type === 'Handover')?.performedAt)}</p>
          ) : canHandover ? (
            <Button icon={<ClipboardCheck size={16} />} onClick={() => setHandoverOpen(true)}>Start Handover</Button>
          ) : <p className="text-sm text-slate-400">Not available for this status</p>}
        </Card>
        <Card>
          <CardHeader title="Vehicle Return" subtitle="Record post-rental inspection & charges" />
          {inspections.some((i) => i.type === 'Return') ? (
            <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 size={16} /> Return completed on {formatDateTime(inspections.find((i) => i.type === 'Return')?.performedAt)}</p>
          ) : canReturn ? (
            <Button icon={<ClipboardCheck size={16} />} onClick={() => setReturnOpen(true)}>Process Return</Button>
          ) : <p className="text-sm text-slate-400">Not available for this status</p>}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Inspections" />
        {inspections.length === 0 ? <EmptyState title="No inspections recorded" /> : (
          <DataTable
            columns={[
              { key: 'type', header: 'Type', render: (i) => <StatusBadge status={i.type} /> },
              { key: 'mileage', header: 'Mileage', render: (i) => `${i.mileage.toLocaleString()} km` },
              { key: 'fuel', header: 'Fuel', render: (i) => `${i.fuelLevel}%` },
              { key: 'date', header: 'Date', render: (i) => formatDateTime(i.performedAt) },
            ]}
            rows={inspections}
            rowKey={(i) => i.id}
          />
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader title="Payments" action={<Link to="/payments"><Button size="sm">View All</Button></Link>} />
        {payments.length === 0 ? <EmptyState title="No payments recorded" /> : (
          <DataTable
            columns={[
              { key: 'number', header: 'Payment', render: (p) => p.number },
              { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatCurrency(p.amount) },
              { key: 'method', header: 'Method', render: (p) => p.method },
              { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
              { key: 'deposit', header: 'Type', render: (p) => p.isDeposit ? <StatusBadge status="Held" /> : 'Rental' },
              { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            ]}
            rows={payments}
            rowKey={(p) => p.id}
          />
        )}
      </Card>

      {editing && <BookingForm booking={booking} onClose={() => setEditing(false)} onSave={(b) => {
        update('bookings', (arr) => arr.map((x) => x.id === b.id ? { ...b, updatedAt: nowISO() } : x), { action: 'UPDATE', entity: 'Booking', entityId: b.id });
        setEditing(false);
      }} />}

      {handoverOpen && <InspectionForm type="Handover" booking={booking} onClose={() => setHandoverOpen(false)} onSave={(ins) => {
        const newIns: Inspection = { ...ins, id: uid('in'), bookingId: booking.id, performedAt: nowISO() };
        update('inspections', (arr) => [...arr, newIns], { action: 'CREATE', entity: 'Inspection', entityId: newIns.id });
        update('bookings', (arr) => arr.map((b) => b.id === booking.id ? { ...b, status: 'Active', updatedAt: nowISO() } : b), { action: 'UPDATE', entity: 'Booking', entityId: booking.id, after: 'status=Active' });
        if (vehicle) update('vehicles', (arr) => arr.map((v) => v.id === vehicle.id ? { ...v, status: 'Rented', updatedAt: nowISO() } : v));
        update('notifications', (arr) => [{ id: uid('nt'), type: 'Handover', channel: 'Popup', subject: `Handover Complete — ${booking.number}`, message: `Vehicle handed over. Odometer: ${ins.mileage} km`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
        toast.success('Handover Complete', `${booking.number} — vehicle handed over at ${ins.mileage} km`);
        setHandoverOpen(false);
      }} />}

      {returnOpen && <InspectionForm type="Return" booking={booking} onClose={() => setReturnOpen(false)} onSave={(ins) => {
        const newIns: Inspection = { ...ins, id: uid('in'), bookingId: booking.id, performedAt: nowISO() };
        update('inspections', (arr) => [...arr, newIns], { action: 'CREATE', entity: 'Inspection', entityId: newIns.id });
        const extraCharges = (ins.lateFee ?? 0) + (ins.fuelCharge ?? 0) + (ins.damageCharge ?? 0) + (ins.cleaningCharge ?? 0) + (ins.extraKmCharge ?? 0);
        update('bookings', (arr) => arr.map((b) => b.id === booking.id ? { ...b, status: 'Completed', additionalCharges: extraCharges, updatedAt: nowISO() } : b), { action: 'UPDATE', entity: 'Booking', entityId: booking.id, after: 'status=Completed' });
        if (vehicle) update('vehicles', (arr) => arr.map((v) => v.id === vehicle.id ? { ...v, status: 'Available', mileage: ins.mileage, updatedAt: nowISO() } : v));

        // Auto-generate invoice for the full booking total (rental + extra charges)
        const rentalTotal = booking.rentalDays * booking.dailyRate;
        const grandTotal = rentalTotal + extraCharges + (booking.additionalCharges ?? 0) - (booking.discount ?? 0);
        const taxAmount = grandTotal * ((booking.taxRate ?? 0) / 100);
        const invoiceNumber = nextSeq('invoice');
        update('documents', (arr) => [{
          id: uid('doc'),
          number: invoiceNumber,
          type: 'Invoice',
          bookingId: booking.id,
          customerId: booking.customerId,
          date: nowISO(),
          subtotal: grandTotal,
          taxAmount,
          total: grandTotal + taxAmount,
          paidAmount: 0, // will be updated by payments
          balance: grandTotal + taxAmount,
          notes: `Auto-generated on return — ${booking.number}`,
          createdAt: nowISO(),
        }, ...arr], { action: 'CREATE', entity: 'Document', entityId: invoiceNumber });

        const kmMsg = booking.pickupOdometer != null ? ` KM used: ${(ins.mileage - booking.pickupOdometer).toLocaleString()}` : '';
        update('notifications', (arr) => [
          { id: uid('nt'), type: 'Return', channel: 'Popup', subject: `Return Complete — ${booking.number}`, message: `Vehicle returned. Odometer: ${ins.mileage} km.${kmMsg}${ins.extraKmCharge ? ` Extra KM charge: ${formatCurrency(ins.extraKmCharge)}` : ''}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() },
          { id: uid('nt'), type: 'Invoice', channel: 'Popup', subject: `Invoice ${invoiceNumber} Generated`, message: `Total: ${formatCurrency(grandTotal + taxAmount)} for ${booking.number}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() },
          ...arr]);
        toast.success('Return Complete', `${booking.number} — vehicle returned${kmMsg} · Invoice ${invoiceNumber}: ${formatCurrency(grandTotal + taxAmount)}`);
        setReturnOpen(false);
      }} />}

      {statusModal && <Modal open onClose={() => setStatusModal(false)} title="Change Booking Status" size="sm"
        footer={<Button variant="secondary" onClick={() => setStatusModal(false)}>Close</Button>}>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button key={s} className={cn('btn-secondary justify-start', booking.status === s && 'border-brand-500 text-brand-700')} onClick={() => {
              update('bookings', (arr) => arr.map((b) => b.id === booking.id ? { ...b, status: s, updatedAt: nowISO() } : b), { action: 'UPDATE', entity: 'Booking', entityId: booking.id, after: `status=${s}` });
              update('notifications', (arr) => [{ id: uid('nt'), type: 'Status Change', channel: 'Popup', subject: `Booking ${booking.number} → ${s}`, message: `Status changed to ${s}`, scheduledAt: nowISO(), status: 'Sent', read: false, createdAt: nowISO() }, ...arr]);
              toast.info('Status Changed', `${booking.number} → ${s}`);
              setStatusModal(false);
            }}>{s}</button>
          ))}
        </div>
      </Modal>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0"><span className="text-slate-500">{label}</span><span className="text-slate-900 font-medium text-right">{value}</span></div>;
}
function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="text-slate-900">{value}</span></div>;
}
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

export function BookingForm({ booking, onClose, onSave }: { booking: Booking | null; onClose: () => void; onSave: (b: Booking) => void }) {
  const { db, update, audit } = useStore();
  const toast = useToast();
  const conflicts = useBookingConflicts();
  const getBookedDates = useVehicleBookedDates();
  const [form, setForm] = useState<Partial<Booking>>(booking ?? { status: 'Confirmed', rentalType: 'Rent', deposit: 0, dailyRate: 0, taxRate: db.settings.taxRate, fuelPolicy: 'Full-to-Full', customerDocuments: [], includedKmPerDay: false });
  const set = (k: keyof Booking, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // New-customer inline entry state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustNic, setNewCustNic] = useState('');
  const [newCustLicense, setNewCustLicense] = useState('');

  const pickup = form.pickupAt ?? '';
  const returnAt = form.returnAt ?? '';
  const rentalDays = pickup && returnAt ? daysBetween(pickup, returnAt) : 0;

  const conflictCheck = form.vehicleId && pickup && returnAt
    ? conflicts(form.vehicleId, pickup, returnAt, booking?.id)
    : { hasConflict: false, conflicts: [], maintenanceConflicts: [] };

  const isHire = form.rentalType === 'Hire';

  // Customer document upload handler
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    try {
      const docs = await Promise.all(files.map(async (file) => ({
        id: uid('bdoc'),
        name: file.name,
        type: 'Customer Document',
        dataUrl: await compressImage(file),
        uploadedAt: nowISO(),
      })));
      set('customerDocuments', [...(form.customerDocuments ?? []), ...docs]);
    } catch (err: any) {
      toast.error('Upload Failed', err?.message ?? 'Could not upload file');
    }
  };

  const removeDoc = (id: string) => {
    set('customerDocuments', (form.customerDocuments ?? []).filter((d) => d.id !== id));
  };

  // Odometer photo upload
  const handleOdometerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      set('odometerPhotoOut', dataUrl);
    } catch (err: any) {
      toast.error('Upload Failed', err?.message ?? 'Could not upload photo');
    }
  };

  const handleSave = () => {
    // Validate with clear error messages
    if (customerMode === 'existing' && !form.customerId) {
      toast.error('Customer Required', 'Please select an existing customer or switch to "New Customer"');
      return;
    }
    if (customerMode === 'new' && !newCustName.trim()) {
      toast.error('Customer Name Required', 'Please enter the customer name');
      return;
    }
    if (!form.vehicleId) {
      toast.error('Vehicle Required', 'Please select a vehicle');
      return;
    }
    if (!pickup) {
      toast.error('Pickup Date Required', 'Please select pickup date and time');
      return;
    }
    if (!returnAt) {
      toast.error('Return Date Required', 'Please select return date and time');
      return;
    }
    if (conflictCheck.hasConflict) {
      toast.error('Booking Conflict', 'This vehicle is already booked for the selected dates');
      return;
    }
    // Mandatory: customer documents
    if (!form.customerDocuments || form.customerDocuments.length === 0) {
      toast.error('Documents Required', 'Please upload at least one customer document (NIC, License, or Passport)');
      return;
    }
    // Mandatory: pickup meter photo
    if (!form.odometerPhotoOut) {
      toast.error('Pickup Meter Photo Required', 'Please upload a photo of the meter box at pickup');
      return;
    }
    // Mandatory: pickup odometer reading
    if (!form.pickupOdometer || form.pickupOdometer <= 0) {
      toast.error('Pickup Odometer Required', 'Please enter the pickup odometer reading');
      return;
    }

    let customerId = form.customerId;

    // Auto-create customer if "new" mode and name is provided
    if (customerMode === 'new' && newCustName.trim()) {
      const newCustomer = {
        id: uid('cu'),
        type: 'Individual' as const,
        fullName: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        nic: newCustNic.trim() || undefined,
        drivingLicense: newCustLicense.trim() || undefined,
        status: 'Active' as const,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      update('customers', (arr) => [newCustomer, ...arr], { action: 'CREATE', entity: 'Customer', entityId: newCustomer.id, after: JSON.stringify({ name: newCustomer.fullName, phone: newCustomer.phone }) });
      toast.info('Customer Auto-Saved', `${newCustName.trim()} added to Customers tab`);
      customerId = newCustomer.id;
    }

    if (!customerId) {
      toast.error('Customer Required', 'Could not determine customer');
      return;
    }
    onSave({ ...form, customerId, rentalDays, pickupAt: pickup, returnAt: returnAt } as Booking);
  };

  return (
    <Modal open onClose={onClose} title={booking ? 'Edit Booking' : 'New Booking'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>Save Booking</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Rental Type */}
        <Field label="Rental Type" required>
          <div className="flex gap-2">
            <button type="button" onClick={() => set('rentalType', 'Rent')} className={cn('flex-1 btn', form.rentalType === 'Rent' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700')}>Rent (Self-Drive)</button>
            <button type="button" onClick={() => set('rentalType', 'Hire')} className={cn('flex-1 btn', form.rentalType === 'Hire' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700')}>Hire (With Driver)</button>
          </div>
        </Field>
        <Field label="Status"><Select value={form.status ?? 'Confirmed'} onChange={(e) => set('status', e.target.value as BookingStatus)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>

        {/* Customer — existing or new */}
        <Field label="Customer" required className="sm:col-span-2">
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setCustomerMode('existing')} className={cn('btn-sm', customerMode === 'existing' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700')}>Existing Customer</button>
            <button type="button" onClick={() => setCustomerMode('new')} className={cn('btn-sm', customerMode === 'new' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700')}>+ New Customer</button>
          </div>
          {customerMode === 'existing' ? (
            <Select value={form.customerId ?? ''} onChange={(e) => set('customerId', e.target.value)}>
              <option value="">Select customer…</option>
              {db.customers.map((c) => <option key={c.id} value={c.id}>{c.type === 'Corporate' ? c.companyName : c.fullName} {c.phone ? `· ${c.phone}` : ''}</option>)}
            </Select>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <Field label="Customer Name" required><Input value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Full name" /></Field>
              <Field label="Phone Number" required><Input value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="+94 77 123 4567" /></Field>
              <Field label="NIC / Passport"><Input value={newCustNic} onChange={(e) => setNewCustNic(e.target.value)} placeholder="901234567V" /></Field>
              <Field label="Driving License #"><Input value={newCustLicense} onChange={(e) => setNewCustLicense(e.target.value)} placeholder="B1234567" /></Field>
              <p className="text-xs text-slate-500 sm:col-span-2">This customer will be automatically saved to the Customers tab when you save the booking.</p>
            </div>
          )}
        </Field>

        <Field label="Vehicle" required>
          <Select value={form.vehicleId ?? ''} onChange={(e) => set('vehicleId', e.target.value)}>
            <option value="">Select vehicle…</option>
            {db.vehicles.filter((v) => !['Sold', 'Inactive'].includes(v.status)).map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.regNumber}) — {v.status}</option>)}
          </Select>
        </Field>
        {form.vehicleId && (() => {
          const booked = getBookedDates(form.vehicleId, booking?.id);
          if (booked.length === 0) return null;
          return (
            <div className="sm:col-span-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠ This vehicle is already booked on these dates:</p>
              {booked.map((b, i) => (
                <p key={i}>• {b.bookingNumber}: {b.start.toLocaleDateString()} → {b.end.toLocaleDateString()}</p>
              ))}
              <p className="mt-1 text-amber-600">Please avoid these date ranges when selecting pickup/return.</p>
            </div>
          );
        })()}
        <Field label="Driver" hint={isHire ? 'Required for Hire' : 'Optional'}>
          <Select value={form.driverId ?? ''} onChange={(e) => set('driverId', e.target.value || undefined)}>
            <option value="">No driver</option>
            {db.drivers.filter((d) => d.status === 'Active').map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </Select>
        </Field>
        <Field label="Pickup Date/Time" required>
          <DatePicker
            value={pickup}
            onChange={(iso) => set('pickupAt', iso)}
            disabledRanges={form.vehicleId ? getBookedDates(form.vehicleId, booking?.id) : []}
            placeholder="Select pickup date & time"
          />
        </Field>
        <Field label="Return Date/Time" required>
          <DatePicker
            value={returnAt}
            onChange={(iso) => set('returnAt', iso)}
            disabledRanges={form.vehicleId ? getBookedDates(form.vehicleId, booking?.id) : []}
            placeholder="Select return date & time"
          />
        </Field>
        <Field label="Pickup Location"><Input value={form.pickupLocation ?? ''} onChange={(e) => set('pickupLocation', e.target.value)} /></Field>
        <Field label="Return Location"><Input value={form.returnLocation ?? ''} onChange={(e) => set('returnLocation', e.target.value)} /></Field>
        <Field label="Daily Rate" required><Input type="number" value={form.dailyRate ?? ''} onChange={(e) => set('dailyRate', +e.target.value)} /></Field>
        <Field label="Rental Days" hint="Auto-calculated"><Input value={rentalDays} disabled /></Field>
        <Field label="Included KM" hint={form.includedKmPerDay ? `Per day × ${rentalDays} days = ${(form.includedKm ?? 0) * rentalDays} km total` : 'Total free km for this rental'}>
          <div className="flex gap-2">
            <Input type="number" value={form.includedKm ?? ''} onChange={(e) => set('includedKm', +e.target.value)} placeholder="e.g. 300" />
            <button type="button" onClick={() => set('includedKmPerDay', !form.includedKmPerDay)} className={cn('btn-sm whitespace-nowrap', form.includedKmPerDay ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700')}>
              {form.includedKmPerDay ? '/day ✓' : '/day'}
            </button>
          </div>
        </Field>
        <Field label="Extra KM Rate" hint="Per km charge beyond included km"><Input type="number" value={form.extraKmRate ?? ''} onChange={(e) => set('extraKmRate', +e.target.value)} placeholder="e.g. 12" /></Field>
        <Field label="Fuel Policy"><Select value={form.fuelPolicy ?? 'Full-to-Full'} onChange={(e) => set('fuelPolicy', e.target.value as any)}><option>Full-to-Full</option><option>Prepaid</option><option>Same Level</option></Select></Field>
        <Field label="Advance Payment" hint="Amount customer pays upfront as advance (recorded as a paid payment)"><Input type="number" value={form.deposit ?? ''} onChange={(e) => set('deposit', +e.target.value)} placeholder="e.g. 5000" /></Field>
        <Field label="Discount"><Input type="number" value={form.discount ?? ''} onChange={(e) => set('discount', +e.target.value)} /></Field>
        <Field label="Tax Rate (%)"><Input type="number" value={form.taxRate ?? 0} onChange={(e) => set('taxRate', +e.target.value)} /></Field>
        <Field label="Additional Charges"><Input type="number" value={form.additionalCharges ?? ''} onChange={(e) => set('additionalCharges', +e.target.value)} /></Field>

        {/* Pickup Odometer + Photo */}
        <Field label="Pickup Odometer (km)" hint="Meter reading at handover">
          <Input type="number" value={form.pickupOdometer ?? ''} onChange={(e) => set('pickupOdometer', +e.target.value)} placeholder="e.g. 84500" />
        </Field>
        <Field label="Pickup Meter Photo">
          <input type="file" accept="image/*" capture="environment" onChange={handleOdometerPhoto} className="input !py-1.5 !px-2 text-xs" />
          {form.odometerPhotoOut && <img src={form.odometerPhotoOut} alt="Pickup meter" className="mt-2 rounded-lg max-h-32 object-cover" />}
        </Field>

        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>

      {/* Customer Documents Upload */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-2">Customer Documents (NIC, License, Passport, etc.)</p>
        <input type="file" accept="image/*,application/pdf" multiple onChange={handleDocUpload} className="input !py-1.5 !px-2 text-xs" />
        {form.customerDocuments && form.customerDocuments.length > 0 && (
          <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {form.customerDocuments.map((doc) => (
              <div key={doc.id} className="relative group">
                {doc.dataUrl.startsWith('data:image') ? (
                  <img src={doc.dataUrl} alt={doc.name} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                ) : (
                  <div className="w-full h-20 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-500 bg-white">PDF</div>
                )}
                <p className="text-[10px] text-slate-500 truncate mt-1">{doc.name}</p>
                <button type="button" onClick={() => removeDoc(doc.id)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {conflictCheck.hasConflict && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Booking conflict detected</p>
            {conflictCheck.conflicts.map((c) => <p key={c.id} className="text-xs mt-1">Overlaps booking {c.number} ({formatDateTime(c.pickupAt)} → {formatDateTime(c.returnAt)})</p>)}
            {conflictCheck.maintenanceConflicts.map((m) => <p key={m.id} className="text-xs mt-1">Overlaps maintenance ({formatDate(m.serviceDate)} → {m.nextServiceDate ? formatDate(m.nextServiceDate) : '—'})</p>)}
            <p className="text-xs mt-1">This booking cannot be saved until the conflict is resolved.</p>
          </div>
        </div>
      )}

      {rentalDays > 0 && form.dailyRate ? (
        <div className="mt-4 p-3 rounded-lg bg-brand-50 text-sm flex justify-between">
          <span className="text-brand-700">Estimated total (rental base)</span>
          <span className="font-semibold text-brand-700">{formatCurrency(rentalDays * (form.dailyRate ?? 0))}</span>
        </div>
      ) : null}
    </Modal>
  );
}

function InspectionForm({ type, booking, onClose, onSave }: { type: 'Handover' | 'Return'; booking: Booking; onClose: () => void; onSave: (i: Omit<Inspection, 'id' | 'bookingId' | 'performedAt'>) => void }) {
  const { db, update, nextSeq } = useStore();
  const toast = useToast();
  const vehicle = db.vehicles.find((v) => v.id === booking.vehicleId);
  const handover = db.inspections.find((i) => i.bookingId === booking.id && i.type === 'Handover');
  const [form, setForm] = useState<Partial<Inspection>>({ type, mileage: type === 'Handover' ? (booking.pickupOdometer ?? vehicle?.mileage) : handover?.mileage, fuelLevel: 100, hasDamage: false, damagePhotos: [] });
  const set = (k: keyof Inspection, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Odometer photo state (stored on booking, not inspection)
  const [odometerPhoto, setOdometerPhoto] = useState<string | undefined>(type === 'Handover' ? booking.odometerPhotoOut : booking.odometerPhotoIn);

  // Payment state for return inspection
  const bookingPayments = db.payments.filter((p) => p.bookingId === booking.id && p.status === 'Paid');
  const advancePaid = bookingPayments.filter((p) => !p.isDeposit).reduce((a, p) => a + p.amount, 0);
  const depositPaid = bookingPayments.filter((p) => p.isDeposit).reduce((a, p) => a + p.amount, 0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [balancePayment, setBalancePayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Online Gateway' | 'Cheque' | 'Other'>('Cash');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setOdometerPhoto(dataUrl);
    } catch (err: any) {
      toast.error('Upload Failed', err?.message ?? 'Could not upload photo');
    }
  };

  // Damage photo upload (return inspection)
  const handleDamagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    try {
      const photos = await Promise.all(files.map(async (file) => await compressImage(file)));
      set('damagePhotos', [...(form.damagePhotos ?? []), ...photos]);
    } catch (err: any) {
      toast.error('Upload Failed', err?.message ?? 'Could not upload photos');
    }
  };

  const removeDamagePhoto = (idx: number) => {
    set('damagePhotos', (form.damagePhotos ?? []).filter((_, i) => i !== idx));
  };

  // KM calculation for return
  const pickupOdo = booking.pickupOdometer ?? handover?.mileage ?? 0;
  const returnOdo = form.mileage ?? 0;
  const kmUsed = Math.max(returnOdo - pickupOdo, 0);
  const totalIncludedKm = booking.includedKmPerDay ? (booking.includedKm ?? 0) * booking.rentalDays : (booking.includedKm ?? 0);
  const extraKm = Math.max(kmUsed - totalIncludedKm, 0);
  const extraKmRate = booking.extraKmRate ?? 0;
  const calculatedExtraKmCharge = extraKm * extraKmRate;

  // Total charges
  const rentalTotal = booking.rentalDays * booking.dailyRate;
  const extraCharges = (form.lateFee ?? 0) + (form.fuelCharge ?? 0) + (form.damageCharge ?? 0) + (form.cleaningCharge ?? 0) + calculatedExtraKmCharge + (booking.additionalCharges ?? 0);
  const grandTotal = rentalTotal + extraCharges - (booking.discount ?? 0);
  const balanceDue = grandTotal - advancePaid;

  const handleSave = () => {
    // Validate meter photo
    if (!odometerPhoto) {
      toast.error('Meter Photo Required', `Please upload the ${type === 'Handover' ? 'pickup' : 'return'} meter photo`);
      return;
    }
    if (!form.mileage || form.mileage <= 0) {
      toast.error('Odometer Required', 'Please enter the odometer reading');
      return;
    }
    // Validate damage photos if damage is ticked
    if (type === 'Return' && form.hasDamage && (!form.damagePhotos || form.damagePhotos.length === 0)) {
      toast.error('Damage Photos Required', 'Please upload at least one photo of the damage');
      return;
    }

    // Save odometer photo to booking
    if (type === 'Handover') {
      update('bookings', (arr) => arr.map((b) => b.id === booking.id ? { ...b, pickupOdometer: form.mileage, odometerPhotoOut: odometerPhoto } : b));
    } else {
      update('bookings', (arr) => arr.map((b) => b.id === booking.id ? { ...b, returnOdometer: form.mileage, odometerPhotoIn: odometerPhoto, kmUsed, extraKm, extraKmCharge: calculatedExtraKmCharge } : b));
      set('extraKmCharge', calculatedExtraKmCharge);

      // Record advance payment if entered
      if (advancePayment > 0) {
        const payNumber = nextSeq('payment');
        update('payments', (arr) => [{
          id: uid('pay'), number: payNumber, bookingId: booking.id, customerId: booking.customerId,
          amount: advancePayment, date: nowISO(), method: paymentMethod, status: 'Paid',
          notes: 'Advance payment at return', createdAt: nowISO(),
        }, ...arr], { action: 'CREATE', entity: 'Payment', entityId: payNumber });
      }
      // Record balance payment if entered
      if (balancePayment > 0) {
        const payNumber = nextSeq('payment');
        update('payments', (arr) => [{
          id: uid('pay'), number: payNumber, bookingId: booking.id, customerId: booking.customerId,
          amount: balancePayment, date: nowISO(), method: paymentMethod, status: 'Paid',
          notes: 'Balance payment at return', createdAt: nowISO(),
        }, ...arr], { action: 'CREATE', entity: 'Payment', entityId: payNumber });
      }
    }
    onSave(form as any);
  };

  return (
    <Modal open onClose={onClose} title={type === 'Handover' ? 'Vehicle Handover Inspection' : 'Vehicle Return Inspection'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>{type === 'Handover' ? 'Complete Handover' : 'Complete Return'}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={type === 'Handover' ? 'Pickup Odometer (km)' : 'Return Odometer (km)'} required>
          <Input type="number" value={form.mileage ?? ''} onChange={(e) => set('mileage', +e.target.value)} />
        </Field>
        <Field label="Fuel Level (%)" required><Input type="number" min={0} max={100} value={form.fuelLevel ?? ''} onChange={(e) => set('fuelLevel', +e.target.value)} /></Field>

        {/* Odometer / Meter Photo */}
        <Field label={type === 'Handover' ? 'Pickup Meter Photo *' : 'Return Meter Photo *'} className="sm:col-span-2">
          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="input !py-1.5 !px-2 text-xs" />
          {odometerPhoto && <img src={odometerPhoto} alt="Meter photo" className="mt-2 rounded-lg max-h-40 object-cover" />}
        </Field>

        <Field label="Exterior Condition"><Textarea value={form.exteriorCondition ?? ''} onChange={(e) => set('exteriorCondition', e.target.value)} /></Field>
        <Field label="Interior Condition"><Textarea value={form.interiorCondition ?? ''} onChange={(e) => set('interiorCondition', e.target.value)} /></Field>
        <Field label="Tyre Condition"><Input value={form.tyreCondition ?? ''} onChange={(e) => set('tyreCondition', e.target.value)} /></Field>
        <Field label="Accessories"><Input value={form.accessories ?? ''} onChange={(e) => set('accessories', e.target.value)} /></Field>
        {type === 'Handover' ? (
          <Field label="Existing Damage" className="sm:col-span-2"><Textarea value={form.existingDamage ?? ''} onChange={(e) => set('existingDamage', e.target.value)} /></Field>
        ) : (
          <>
            {/* Damage checkbox + photos */}
            <Field label="New Damage?" className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.hasDamage ?? false} onChange={(e) => set('hasDamage', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-slate-700">Yes, there is new damage to the vehicle</span>
              </label>
            </Field>
            {form.hasDamage && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <Field label="Damage Description" required><Textarea value={form.newDamage ?? ''} onChange={(e) => set('newDamage', e.target.value)} placeholder="Describe the damage in detail (location, severity, type)..." /></Field>
                <p className="text-xs font-semibold text-red-700 mt-2 mb-1">Damage Photos *</p>
                <input type="file" accept="image/*" capture="environment" multiple onChange={handleDamagePhotoUpload} className="input !py-1.5 !px-2 text-xs" />
                {form.damagePhotos && form.damagePhotos.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {form.damagePhotos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img src={photo} alt={`Damage ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border border-red-200" />
                        <button type="button" onClick={() => removeDamagePhoto(idx)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Field label="Missing Accessories"><Input value={form.missingAccessories ?? ''} onChange={(e) => set('missingAccessories', e.target.value)} /></Field>

            {/* KM Usage Calculation Display */}
            <div className="sm:col-span-2 p-3 rounded-lg bg-brand-50 border border-brand-200">
              <p className="text-xs font-semibold text-brand-700 mb-2">KM Usage Calculation</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><p className="text-slate-500">Pickup KM</p><p className="font-semibold text-slate-900">{pickupOdo.toLocaleString()}</p></div>
                <div><p className="text-slate-500">Return KM</p><p className="font-semibold text-slate-900">{returnOdo.toLocaleString()}</p></div>
                <div><p className="text-slate-500">Used KM</p><p className="font-semibold text-slate-900">{kmUsed.toLocaleString()}</p></div>
                <div><p className="text-slate-500">Included KM</p><p className="font-semibold text-slate-900">{totalIncludedKm.toLocaleString()}{booking.includedKmPerDay ? ` (${booking.includedKm}/day × ${booking.rentalDays}d)` : ''}</p></div>
              </div>
              <div className="mt-2 pt-2 border-t border-brand-200 flex justify-between text-sm">
                <span className="text-brand-700">Extra KM: <strong>{extraKm.toLocaleString()}</strong> × {formatCurrency(extraKmRate)}/km</span>
                <span className="font-bold text-brand-700">Extra KM Charge: {formatCurrency(calculatedExtraKmCharge)}</span>
              </div>
              {extraKm > 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠ {extraKm.toLocaleString()} km over the included {totalIncludedKm.toLocaleString()} km allowance</p>
              )}
            </div>

            <Field label="Late Fee"><Input type="number" value={form.lateFee ?? ''} onChange={(e) => set('lateFee', +e.target.value)} /></Field>
            <Field label="Fuel Charge"><Input type="number" value={form.fuelCharge ?? ''} onChange={(e) => set('fuelCharge', +e.target.value)} /></Field>
            <Field label="Damage Charge"><Input type="number" value={form.damageCharge ?? ''} onChange={(e) => set('damageCharge', +e.target.value)} /></Field>
            <Field label="Cleaning Charge"><Input type="number" value={form.cleaningCharge ?? ''} onChange={(e) => set('cleaningCharge', +e.target.value)} /></Field>
            <Field label="Extra KM Charge" hint="Auto-calculated from odometer readings">
              <Input type="number" value={form.extraKmCharge ?? calculatedExtraKmCharge} onChange={(e) => set('extraKmCharge', +e.target.value)} />
            </Field>

            {/* Payment Details — Advance + Balance */}
            <div className="sm:col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">Payment Details</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                <div><p className="text-slate-500">Rental Total</p><p className="font-semibold text-slate-900">{formatCurrency(rentalTotal)}</p></div>
                <div><p className="text-slate-500">Extra Charges</p><p className="font-semibold text-slate-900">{formatCurrency(extraCharges)}</p></div>
                <div><p className="text-slate-500">Grand Total</p><p className="font-semibold text-slate-900">{formatCurrency(grandTotal)}</p></div>
                <div><p className="text-slate-500">Advance Paid</p><p className="font-semibold text-green-600">{formatCurrency(advancePaid)}</p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                <div><p className="text-slate-500">Deposit Held</p><p className="font-semibold text-slate-900">{formatCurrency(depositPaid)}</p></div>
                <div><p className="text-slate-500">Balance Due</p><p className="font-bold text-red-600">{formatCurrency(Math.max(balanceDue, 0))}</p></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <Field label="Advance Payment"><Input type="number" value={advancePayment || ''} onChange={(e) => setAdvancePayment(+e.target.value)} placeholder="0" /></Field>
                <Field label="Balance Payment"><Input type="number" value={balancePayment || ''} onChange={(e) => setBalancePayment(+e.target.value)} placeholder="0" /></Field>
                <Field label="Payment Method">
                  <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                    <option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Online Gateway</option><option>Cheque</option><option>Other</option>
                  </Select>
                </Field>
              </div>
            </div>
          </>
        )}
        <Field label="Performed By"><Input value={form.performedBy ?? ''} onChange={(e) => set('performedBy', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
