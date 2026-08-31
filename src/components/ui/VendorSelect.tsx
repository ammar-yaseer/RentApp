import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useStore } from '../../data/store';
import { useToast } from '../Toast';
import { Select, Input } from './Form';
import { uid, nowISO } from '../../lib/utils';
import type { Vendor } from '../../types';

const VENDOR_TYPES: Vendor['type'][] = ['Garage', 'Insurance', 'Bank', 'Supplier', 'Cleaning', 'Parts', 'Other'];

interface VendorSelectProps {
  value?: string;
  onChange: (vendorId: string | undefined) => void;
}

/**
 * Vendor dropdown with an inline "+ New Vendor" option.
 * When the user picks "__new__", inline fields appear to create a vendor on the fly.
 * The newly created vendor is saved to the store and auto-selected.
 */
export function VendorSelect({ value, onChange }: VendorSelectProps) {
  const { db, update } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState<'select' | 'new'>('select');
  const [name, setName] = useState('');
  const [type, setType] = useState<Vendor['type']>('Garage');
  const [phone, setPhone] = useState('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === '__new__') {
      setMode('new');
      onChange(undefined);
      return;
    }
    setMode('select');
    onChange(v || undefined);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Vendor Name Required', 'Please enter the vendor name');
      return;
    }
    const newVendor: Vendor = {
      id: uid('vn'),
      name: name.trim(),
      type,
      phone: phone.trim() || undefined,
      outstandingBalance: 0,
      createdAt: nowISO(),
    };
    update('vendors', (arr) => [newVendor, ...arr], { action: 'CREATE', entity: 'Vendor', entityId: newVendor.id });
    toast.success('Vendor Added', `${newVendor.name} added to vendors`);
    onChange(newVendor.id);
    setMode('select');
    setName('');
    setPhone('');
    setType('Garage');
  };

  const handleCancel = () => {
    setMode('select');
    setName('');
    setPhone('');
    setType('Garage');
  };

  if (mode === 'new') {
    return (
      <div className="space-y-2">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-2">New Vendor</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name *" />
            <Select value={type} onChange={(e) => setType(e.target.value as Vendor['type'])}>
              {VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" />
            <div className="flex gap-2">
              <button type="button" onClick={handleCreate} className="btn-sm bg-brand-600 text-white flex items-center gap-1">
                <Check size={14} /> Add
              </button>
              <button type="button" onClick={handleCancel} className="btn-sm bg-white border border-slate-300 text-slate-700 flex items-center gap-1">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select value={value ?? ''} onChange={handleSelectChange} className="flex-1">
        <option value="">—</option>
        {db.vendors.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.type})</option>)}
        <option value="__new__">+ New Vendor…</option>
      </Select>
    </div>
  );
}
