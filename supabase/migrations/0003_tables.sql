-- 0003_tables.sql
-- All business tables mirroring src/types/index.ts.
-- snake_case columns, text PKs (frontend generates IDs via uid()),
-- timestamptz for all dates, jsonb for arrays/complex objects.

-- === Branches ===
create table if not exists branches (
  id text primary key,
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

-- === Vehicles ===
create table if not exists vehicles (
  id text primary key,
  reg_number text not null,
  vin text,
  engine_number text,
  make text not null,
  model text not null,
  year int not null,
  color text,
  transmission transmission_type,
  fuel_type fuel_type,
  seating_capacity int,
  mileage int not null default 0,
  purchase_date timestamptz,
  purchase_price numeric,
  book_value numeric,
  branch_id text references branches(id) on delete set null,
  status vehicle_status not null default 'Available',
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Vehicle Documents ===
create table if not exists vehicle_documents (
  id text primary key,
  vehicle_id text not null references vehicles(id) on delete cascade,
  type vehicle_document_type not null,
  reference text,
  issue_date timestamptz,
  expiry_date timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- === Customers ===
create table if not exists customers (
  id text primary key,
  type customer_type not null default 'Individual',
  full_name text,
  nic text,
  driving_license text,
  driving_license_expiry timestamptz,
  date_of_birth timestamptz,
  company_name text,
  business_reg_number text,
  credit_terms_days int,
  credit_limit numeric,
  authorized_drivers jsonb default '[]'::jsonb,
  contacts jsonb default '[]'::jsonb,
  address text,
  phone text,
  email text,
  emergency_contact text,
  status customer_status not null default 'Active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Drivers ===
create table if not exists drivers (
  id text primary key,
  full_name text not null,
  phone text,
  email text,
  license_number text,
  license_expiry timestamptz,
  address text,
  status driver_status not null default 'Active',
  created_at timestamptz not null default now()
);

-- === Bookings ===
create table if not exists bookings (
  id text primary key,
  number text not null unique,
  customer_id text not null references customers(id) on delete restrict,
  vehicle_id text not null references vehicles(id) on delete restrict,
  driver_id text references drivers(id) on delete set null,
  rental_type rental_type not null default 'Rent',
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  pickup_location text,
  return_location text,
  rental_days int not null default 1,
  daily_rate numeric not null default 0,
  extra_km_rate numeric,
  included_km int,
  included_km_per_day boolean default false,
  fuel_policy fuel_policy,
  deposit numeric not null default 0,
  discount numeric,
  tax_rate numeric default 0,
  additional_charges numeric,
  status booking_status not null default 'Confirmed',
  notes text,
  pickup_odometer int,
  return_odometer int,
  odometer_photo_out text,
  odometer_photo_in text,
  customer_documents jsonb default '[]'::jsonb,
  km_used int,
  extra_km int,
  extra_km_charge numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Inspections ===
create table if not exists inspections (
  id text primary key,
  booking_id text not null references bookings(id) on delete cascade,
  type inspection_type not null,
  mileage int not null default 0,
  fuel_level int not null default 100 check (fuel_level >= 0 and fuel_level <= 100),
  exterior_condition text,
  interior_condition text,
  tyre_condition text,
  accessories text,
  existing_damage text,
  new_damage text,
  missing_accessories text,
  photos jsonb default '[]'::jsonb,
  damage_photos jsonb default '[]'::jsonb,
  has_damage boolean default false,
  customer_signature text,
  staff_signature text,
  late_fee numeric,
  fuel_charge numeric,
  damage_charge numeric,
  cleaning_charge numeric,
  extra_km_charge numeric,
  performed_at timestamptz not null default now(),
  performed_by text
);

-- === Payments ===
create table if not exists payments (
  id text primary key,
  number text not null unique,
  booking_id text references bookings(id) on delete set null,
  customer_id text references customers(id) on delete set null,
  amount numeric not null default 0,
  date timestamptz not null default now(),
  method payment_method not null default 'Cash',
  reference text,
  received_by text,
  notes text,
  gateway_txn_id text,
  is_deposit boolean default false,
  status payment_status not null default 'Paid',
  created_at timestamptz not null default now()
);

-- === Deposits ===
create table if not exists deposits (
  id text primary key,
  booking_id text not null references bookings(id) on delete cascade,
  customer_id text not null references customers(id) on delete restrict,
  required numeric not null default 0,
  received numeric not null default 0,
  method payment_method,
  deductions numeric,
  refund_amount numeric,
  refund_date timestamptz,
  refund_method payment_method,
  deduction_reason text,
  status deposit_status not null default 'Held',
  created_at timestamptz not null default now()
);

-- === Documents (Invoices/Receipts) ===
create table if not exists documents (
  id text primary key,
  number text not null unique,
  type document_type not null,
  booking_id text references bookings(id) on delete set null,
  customer_id text references customers(id) on delete set null,
  corporate_account_id text references customers(id) on delete set null,
  date timestamptz not null default now(),
  subtotal numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  paid_amount numeric not null default 0,
  balance numeric not null default 0,
  notes text,
  voided boolean default false,
  created_at timestamptz not null default now()
);

-- === Vendors ===
create table if not exists vendors (
  id text primary key,
  name text not null,
  type vendor_type not null default 'Other',
  phone text,
  email text,
  address text,
  outstanding_balance numeric default 0,
  created_at timestamptz not null default now()
);

-- === Expenses ===
create table if not exists expenses (
  id text primary key,
  number text not null unique,
  date timestamptz not null default now(),
  category expense_category not null default 'Other',
  amount numeric not null default 0,
  vehicle_id text references vehicles(id) on delete set null,
  branch_id text references branches(id) on delete set null,
  vendor_id text references vendors(id) on delete set null,
  paid_by text,
  method payment_method,
  reference text,
  receipt_url text,
  notes text,
  approval_status expense_approval_status default 'Pending',
  tax_amount numeric,
  recurring boolean default false,
  created_at timestamptz not null default now()
);

-- === Lease Contracts ===
create table if not exists lease_contracts (
  id text primary key,
  lender text,
  lease_number text,
  vehicle_id text not null references vehicles(id) on delete restrict,
  original_amount numeric not null default 0,
  down_payment numeric,
  interest_rate numeric,
  term_months int,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  monthly_installment numeric not null default 0,
  next_due_date timestamptz,
  outstanding_principal numeric not null default 0,
  status lease_status not null default 'Active',
  created_at timestamptz not null default now()
);

-- === Lease Payments ===
create table if not exists lease_payments (
  id text primary key,
  lease_id text not null references lease_contracts(id) on delete cascade,
  installment_no int not null default 1,
  due_date timestamptz not null,
  amount numeric not null default 0,
  opening_balance numeric,
  principal numeric,
  interest numeric,
  closing_balance numeric,
  paid_date timestamptz,
  bank_reference text,
  receipt_url text,
  status lease_payment_status not null default 'Pending',
  paid_amount numeric,
  created_at timestamptz not null default now()
);

-- === Insurances ===
create table if not exists insurances (
  id text primary key,
  vehicle_id text not null references vehicles(id) on delete cascade,
  provider text,
  policy_number text,
  policy_type text,
  coverage text,
  start_date timestamptz not null default now(),
  expiry_date timestamptz not null,
  premium numeric not null default 0,
  excess numeric,
  status insurance_status not null default 'Active',
  created_at timestamptz not null default now()
);

-- === Insurance Claims ===
create table if not exists insurance_claims (
  id text primary key,
  insurance_id text not null references insurances(id) on delete cascade,
  date timestamptz not null default now(),
  claim_amount numeric not null default 0,
  status insurance_claim_status not null default 'Filed',
  settlement_amount numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- === Maintenances ===
create table if not exists maintenances (
  id text primary key,
  vehicle_id text not null references vehicles(id) on delete cascade,
  type maintenance_type not null default 'Preventive',
  service_date timestamptz not null default now(),
  odometer int not null default 0,
  work_performed text,
  parts text,
  labour_cost numeric,
  parts_cost numeric,
  vendor_id text references vendors(id) on delete set null,
  total_cost numeric not null default 0,
  next_service_date timestamptz,
  next_service_mileage int,
  notes text,
  created_at timestamptz not null default now()
);

-- === Investors ===
create table if not exists investors (
  id text primary key,
  full_name text not null,
  nic text,
  address text,
  phone text,
  email text,
  join_date timestamptz not null default now(),
  investment_amount numeric not null default 0,
  ownership_pct numeric not null default 0,
  profit_share_pct numeric not null default 0,
  capital_balance numeric not null default 0,
  status investor_status not null default 'Active',
  bank_details text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Investor Transactions ===
create table if not exists investor_transactions (
  id text primary key,
  investor_id text not null references investors(id) on delete cascade,
  type investor_txn_type not null,
  amount numeric not null default 0,
  date timestamptz not null default now(),
  notes text,
  reference text,
  created_at timestamptz not null default now()
);

-- === Profit Allocations ===
create table if not exists profit_allocations (
  id text primary key,
  period text not null,
  investor_id text not null references investors(id) on delete cascade,
  distributable_profit numeric not null default 0,
  share_pct numeric not null default 0,
  allocated_amount numeric not null default 0,
  status profit_allocation_status not null default 'Draft',
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- === Reserve Accounts ===
create table if not exists reserve_accounts (
  id text primary key,
  type reserve_type not null,
  name text not null,
  opening_balance numeric not null default 0,
  current_balance numeric not null default 0,
  monthly_target numeric,
  contribution_method reserve_contribution_method not null default 'Manual',
  contribution_value numeric,
  created_at timestamptz not null default now()
);

-- === Reserve Transactions ===
create table if not exists reserve_transactions (
  id text primary key,
  reserve_id text not null references reserve_accounts(id) on delete cascade,
  type reserve_txn_type not null,
  amount numeric not null default 0,
  date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- === Settlements ===
create table if not exists settlements (
  id text primary key,
  number text not null unique,
  investor_id text not null references investors(id) on delete restrict,
  period text not null,
  amount numeric not null default 0,
  status settlement_status not null default 'Draft',
  date timestamptz not null default now(),
  paid_date timestamptz,
  bank_reference text,
  notes text,
  created_at timestamptz not null default now()
);

-- === Bank Accounts ===
create table if not exists bank_accounts (
  id text primary key,
  name text not null,
  type bank_account_type not null default 'Cash',
  opening_balance numeric not null default 0,
  current_balance numeric not null default 0,
  bank_name text,
  account_number text,
  created_at timestamptz not null default now()
);

-- === Bank Transactions ===
create table if not exists bank_transactions (
  id text primary key,
  account_id text not null references bank_accounts(id) on delete cascade,
  type bank_txn_type not null,
  amount numeric not null default 0,
  date timestamptz not null default now(),
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

-- === Notifications ===
create table if not exists notifications (
  id text primary key,
  type text not null,
  channel notification_channel not null default 'Popup',
  recipient text,
  subject text not null,
  message text not null,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  status notification_status not null default 'Pending',
  failure_reason text,
  read boolean default false,
  created_at timestamptz not null default now()
);

-- === Notification Templates ===
create table if not exists notification_templates (
  id text primary key,
  type text not null,
  name text not null,
  channel notification_channel not null default 'Popup',
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- === Audit Logs ===
create table if not exists audit_logs (
  id text primary key default gen_random_uuid()::text,
  user_email text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  timestamp timestamptz not null default now(),
  ip text
);

-- === Settings (singleton — one row, id = 1) ===
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'RentFlow Rent-A-Car',
  logo_url text,
  address text,
  tax_reg_number text,
  default_currency text not null default 'LKR',
  tax_rate numeric not null default 0,
  invoice_prefix text not null default 'INV-',
  invoice_seq int not null default 1,
  receipt_prefix text not null default 'RCP-',
  receipt_seq int not null default 1,
  booking_prefix text not null default 'BK-',
  booking_seq int not null default 1,
  payment_prefix text not null default 'PAY-',
  payment_seq int not null default 1,
  expense_prefix text not null default 'EXP-',
  expense_seq int not null default 1,
  settlement_prefix text not null default 'STL-',
  settlement_seq int not null default 1,
  language text not null default 'en',
  calendar_colors jsonb not null default '{}'::jsonb,
  reminder_defaults jsonb not null default '{}'::jsonb,
  google_calendar_email text,
  google_calendar_sync boolean default false
);

-- === Google OAuth Tokens (for calendar sync) ===
create table if not exists google_tokens (
  id int primary key default 1 check (id = 1),
  user_id uuid references auth.users(id) on delete cascade,
  refresh_token text,
  access_token text,
  expires_at timestamptz,
  calendar_id text,
  sync_token text,
  updated_at timestamptz not null default now()
);

-- === Profiles (links auth.users to app roles/permissions) ===
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  role user_role not null default 'Rental Staff',
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes for common lookups
create index if not exists idx_vehicles_branch on vehicles(branch_id);
create index if not exists idx_vehicles_status on vehicles(status);
create index if not exists idx_bookings_customer on bookings(customer_id);
create index if not exists idx_bookings_vehicle on bookings(vehicle_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_payments_booking on payments(booking_id);
create index if not exists idx_payments_customer on payments(customer_id);
create index if not exists idx_inspections_booking on inspections(booking_id);
create index if not exists idx_expenses_vehicle on expenses(vehicle_id);
create index if not exists idx_notifications_status on notifications(status);
create index if not exists idx_notifications_read on notifications(read);
create index if not exists idx_audit_logs_entity on audit_logs(entity);
create index if not exists idx_audit_logs_timestamp on audit_logs(timestamp desc);
