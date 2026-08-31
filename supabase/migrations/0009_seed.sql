-- 0009_seed.sql
-- Seed data mirroring src/data/seed.ts.
-- IMPORTANT: Create the admin auth user FIRST via the Supabase dashboard
-- (Authentication → Users → Add user → email: admin@rentflow, password: your choice).
-- Then run this seed file. It will insert the profile row for that user
-- with full permissions, plus all the sample business data.

-- Settings singleton
insert into settings (id, business_name, address, tax_reg_number, default_currency, tax_rate,
  invoice_prefix, invoice_seq, receipt_prefix, receipt_seq,
  booking_prefix, booking_seq, payment_prefix, payment_seq,
  expense_prefix, expense_seq, settlement_prefix, settlement_seq,
  language, calendar_colors, reminder_defaults,
  google_calendar_email, google_calendar_sync)
values (1, 'RentFlow Rent-A-Car', 'Colombo 03, Sri Lanka', 'TAX-123-456-789', 'LKR', 0,
  'INV-', 3, 'RCP-', 1, 'BK-', 5, 'PAY-', 5, 'EXP-', 5, 'STL-', 3,
  'en',
  '{"Available":"#16a34a","Booked":"#2563eb","Reserved":"#9333ea","Pickup":"#ea580c","Return":"#0d9488","Overdue":"#dc2626","Maintenance":"#ca8a04","Cancelled":"#6b7280"}'::jsonb,
  '{"Insurance Expiry":["30d","15d","7d","1d"],"Booking Pickup":["24h","3h"],"Lease Due":["7d","1d","0d"]}'::jsonb,
  null, false)
on conflict (id) do nothing;

-- Update the admin profile with full permissions.
-- Replace the UUID below with the actual auth user ID from the dashboard.
-- Or run this after creating the user, then execute:
--   update profiles set role = 'Super Admin', permissions = '{}'::jsonb where email = 'admin@rentflow';
-- The permissions JSON should contain all module keys with all actions true.
-- See src/lib/permissions.ts fullPermissions() for the full list.
-- For convenience, here's the full permissions JSON:
/*
{
  "dashboard":{"view":true,"create":true,"edit":true,"delete":true},
  "vehicles":{"view":true,"create":true,"edit":true,"delete":true},
  "customers":{"view":true,"create":true,"edit":true,"delete":true},
  "bookings":{"view":true,"create":true,"edit":true,"delete":true},
  "drivers":{"view":true,"create":true,"edit":true,"delete":true},
  "payments":{"view":true,"create":true,"edit":true,"delete":true},
  "deposits":{"view":true,"create":true,"edit":true,"delete":true},
  "invoices":{"view":true,"create":true,"edit":true,"delete":true},
  "expenses":{"view":true,"create":true,"edit":true,"delete":true},
  "lease":{"view":true,"create":true,"edit":true,"delete":true},
  "insurance":{"view":true,"create":true,"edit":true,"delete":true},
  "maintenance":{"view":true,"create":true,"edit":true,"delete":true},
  "cashbank":{"view":true,"create":true,"edit":true,"delete":true},
  "reserves":{"view":true,"create":true,"edit":true,"delete":true},
  "investors":{"view":true,"create":true,"edit":true,"delete":true},
  "profit":{"view":true,"create":true,"edit":true,"delete":true},
  "settlements":{"view":true,"create":true,"edit":true,"delete":true},
  "notifications":{"view":true,"create":true,"edit":true,"delete":true},
  "reports":{"view":true,"create":true,"edit":true,"delete":true},
  "audit":{"view":true,"create":true,"edit":true,"delete":true},
  "settings":{"view":true,"create":true,"edit":true,"delete":true}
}
*/

-- Set admin profile to Super Admin with full permissions
update profiles
set role = 'Super Admin',
    permissions = '{"dashboard":{"view":true,"create":true,"edit":true,"delete":true},"vehicles":{"view":true,"create":true,"edit":true,"delete":true},"customers":{"view":true,"create":true,"edit":true,"delete":true},"bookings":{"view":true,"create":true,"edit":true,"delete":true},"drivers":{"view":true,"create":true,"edit":true,"delete":true},"payments":{"view":true,"create":true,"edit":true,"delete":true},"deposits":{"view":true,"create":true,"edit":true,"delete":true},"invoices":{"view":true,"create":true,"edit":true,"delete":true},"expenses":{"view":true,"create":true,"edit":true,"delete":true},"lease":{"view":true,"create":true,"edit":true,"delete":true},"insurance":{"view":true,"create":true,"edit":true,"delete":true},"maintenance":{"view":true,"create":true,"edit":true,"delete":true},"cashbank":{"view":true,"create":true,"edit":true,"delete":true},"reserves":{"view":true,"create":true,"edit":true,"delete":true},"investors":{"view":true,"create":true,"edit":true,"delete":true},"profit":{"view":true,"create":true,"edit":true,"delete":true},"settlements":{"view":true,"create":true,"edit":true,"delete":true},"notifications":{"view":true,"create":true,"edit":true,"delete":true},"reports":{"view":true,"create":true,"edit":true,"delete":true},"audit":{"view":true,"create":true,"edit":true,"delete":true},"settings":{"view":true,"create":true,"edit":true,"delete":true}}'::jsonb
where email = 'admin@rentflow';

-- === Sample business data ===
-- Branches
insert into branches (id, name, address, phone, created_at)
values ('br_main', 'Main Branch', 'Colombo 03', '+94 11 234 5678', now() - interval '400 days')
on conflict (id) do nothing;

-- Vehicles
insert into vehicles (id, reg_number, vin, make, model, year, color, transmission, fuel_type, seating_capacity, mileage, purchase_date, purchase_price, book_value, branch_id, status, created_at, updated_at)
values
  ('vh_1', 'CAR-1234', 'JTDBR32E830000001', 'Toyota', 'Aqua', 2018, 'Silver', 'Auto', 'Hybrid', 5, 85000, now() - interval '800 days', 4200000, 3500000, 'br_main', 'Rented', now() - interval '800 days', now() - interval '2 days'),
  ('vh_2', 'CAR-5678', null, 'Suzuki', 'Wagon R', 2020, 'White', 'Auto', 'Petrol', 5, 42000, now() - interval '500 days', 3800000, 3200000, 'br_main', 'Available', now() - interval '500 days', now() - interval '1 day'),
  ('vh_3', 'VAN-9012', null, 'Nissan', 'NV200', 2019, 'Blue', 'Manual', 'Diesel', 7, 110000, now() - interval '700 days', 6500000, 5200000, 'br_main', 'Maintenance', now() - interval '700 days', now() - interval '5 days'),
  ('vh_4', 'SUV-3456', null, 'Honda', 'Vezel', 2017, 'Black', 'CVT', 'Hybrid', 5, 130000, now() - interval '900 days', 5800000, 4100000, 'br_main', 'Available', now() - interval '900 days', now() - interval '3 days')
on conflict (id) do nothing;

-- Customers
insert into customers (id, type, full_name, nic, driving_license, driving_license_expiry, phone, email, address, emergency_contact, status, created_at, updated_at)
values
  ('cu_1', 'Individual', 'Amal Perera', '901234567V', 'B1234567', now() + interval '400 days', '+94 77 123 4567', 'amal@example.com', 'Colombo 05', '+94 71 999 8888', 'Active', now() - interval '200 days', now() - interval '10 days'),
  ('cu_2', 'Individual', 'Nimal Silva', '887654321V', 'B7654321', now() + interval '60 days', '+94 71 555 4444', 'nimal@example.com', 'Kandy', null, 'Active', now() - interval '150 days', now() - interval '20 days'),
  ('cu_3', 'Individual', 'Kasun Fernando', null, null, null, '+94 76 222 3333', null, null, null, 'Blacklisted', now() - interval '300 days', now() - interval '50 days')
on conflict (id) do nothing;

insert into customers (id, type, company_name, business_reg_number, credit_terms_days, credit_limit, authorized_drivers, contacts, address, phone, status, created_at, updated_at)
values (
  'cu_corp1', 'Corporate', 'Ceylon Tours Ltd', 'PV-12345', 30, 500000,
  '["Saman","Ruwan"]'::jsonb,
  '[{"name":"Finance","phone":"+94 11 444 5566","email":"finance@ceylontours.lk"}]'::jsonb,
  'Colombo 02', '+94 11 444 5566', 'Active', now() - interval '120 days', now() - interval '15 days'
)
on conflict (id) do nothing;

-- Drivers
insert into drivers (id, full_name, phone, license_number, license_expiry, status, created_at)
values ('dr_1', 'Sunil Bandara', '+94 77 888 9999', 'D112233', now() + interval '250 days', 'Active', now() - interval '180 days')
on conflict (id) do nothing;

-- Vendors
insert into vendors (id, name, type, phone, outstanding_balance, created_at)
values
  ('vn_1', 'Auto Care Garage', 'Garage', '+94 11 333 2222', 0, now() - interval '300 days'),
  ('vn_2', 'Sri Insurance Co.', 'Insurance', '+94 11 555 6677', 45000, now() - interval '300 days')
on conflict (id) do nothing;

-- Investors
insert into investors (id, full_name, nic, phone, email, join_date, investment_amount, ownership_pct, profit_share_pct, capital_balance, status, bank_details, created_at, updated_at)
values
  ('inv_1', 'Ravi Investor', '700000001V', '+94 77 100 0001', 'ravi@example.com', now() - interval '800 days', 5000000, 50, 50, 5000000, 'Active', 'Commercial Bank ****1234', now() - interval '800 days', now() - interval '30 days'),
  ('inv_2', 'Nisha Investor', '750000002V', '+94 77 100 0002', 'nisha@example.com', now() - interval '800 days', 3000000, 30, 30, 3000000, 'Active', null, now() - interval '800 days', now() - interval '30 days'),
  ('inv_3', 'Capital Partners Ltd', 'PV-9000001', '+94 11 200 0003', 'cp@example.com', now() - interval '200 days', 2000000, 20, 20, 2000000, 'Active', null, now() - interval '200 days', now() - interval '20 days')
on conflict (id) do nothing;

-- Bank Accounts
insert into bank_accounts (id, name, type, opening_balance, current_balance, bank_name, account_number, created_at)
values
  ('ba_1', 'Cash on Hand', 'Cash', 100000, 245000, null, null, now() - interval '365 days'),
  ('ba_2', 'Commercial Bank Main', 'Bank', 1000000, 1840000, 'Commercial Bank', '****1234', now() - interval '365 days')
on conflict (id) do nothing;

-- Reserve Accounts
insert into reserve_accounts (id, type, name, opening_balance, current_balance, monthly_target, contribution_method, contribution_value, created_at)
values
  ('ra_1', 'Insurance', 'Insurance Reserve', 0, 120000, 20000, 'Fixed', 20000, now() - interval '365 days'),
  ('ra_2', 'Maintenance', 'Maintenance Reserve', 0, 85000, 15000, 'Percent Revenue', 5, now() - interval '365 days'),
  ('ra_3', 'Emergency', 'Emergency Reserve', 0, 50000, null, 'Manual', null, now() - interval '365 days')
on conflict (id) do nothing;

-- Bookings
insert into bookings (id, number, customer_id, vehicle_id, driver_id, rental_type, pickup_at, return_at, rental_days, daily_rate, fuel_policy, deposit, tax_rate, status, pickup_odometer, created_at, updated_at)
values
  ('bk_1', 'BK-0001', 'cu_1', 'vh_1', null, 'Rent', now() - interval '2 days', now() + interval '1 day', 3, 5500, 'Full-to-Full', 20000, 0, 'Active', 84500, now() - interval '5 days', now() - interval '2 days'),
  ('bk_2', 'BK-0002', 'cu_2', 'vh_2', null, 'Rent', now() + interval '20 hours', now() + interval '4 days', 3, 4800, null, 15000, 0, 'Confirmed', null, now() - interval '1 day', now() - interval '1 day'),
  ('bk_3', 'BK-0003', 'cu_corp1', 'vh_4', 'dr_1', 'Hire', now() - interval '6 days', now() - interval '5 days', 2, 7500, null, 0, 0, 'Completed', 129000, now() - interval '10 days', now() - interval '5 days'),
  ('bk_4', 'BK-0004', 'cu_1', 'vh_3', null, 'Rent', now() - interval '10 days', now() - interval '7 days', 3, 9000, null, 30000, 0, 'Overdue', 109500, now() - interval '15 days', now() - interval '7 days')
on conflict (id) do nothing;

-- Update bk_3 return data
update bookings set return_odometer = 129400, km_used = 400 where id = 'bk_3';

-- Payments
insert into payments (id, number, booking_id, customer_id, amount, date, method, received_by, status, is_deposit, created_at)
values
  ('pm_1', 'PAY-0001', 'bk_1', 'cu_1', 16500, now() - interval '2 days', 'Cash', 'Staff', 'Paid', false, now() - interval '2 days'),
  ('pm_2', 'PAY-0002', 'bk_1', 'cu_1', 20000, now() - interval '2 days', 'Cash', 'Staff', 'Paid', true, now() - interval '2 days'),
  ('pm_3', 'PAY-0003', 'bk_3', 'cu_corp1', 15000, now() - interval '5 days', 'Bank Transfer', null, 'Paid', false, now() - interval '5 days'),
  ('pm_4', 'PAY-0004', 'bk_4', 'cu_1', 27000, now() - interval '10 days', 'Card', null, 'Paid', false, now() - interval '10 days')
on conflict (id) do nothing;

-- Deposits
insert into deposits (id, booking_id, customer_id, required, received, method, status, created_at)
values
  ('dp_1', 'bk_1', 'cu_1', 20000, 20000, 'Cash', 'Held', now() - interval '2 days'),
  ('dp_2', 'bk_4', 'cu_1', 30000, 30000, 'Card', 'Held', now() - interval '10 days')
on conflict (id) do nothing;

-- Expenses
insert into expenses (id, number, date, category, amount, vehicle_id, vendor_id, method, notes, approval_status, created_at)
values
  ('ex_1', 'EXP-0001', now() - interval '8 days', 'Fuel', 8500, 'vh_1', null, 'Cash', 'Refill', 'Approved', now() - interval '8 days'),
  ('ex_2', 'EXP-0002', now() - interval '5 days', 'Maintenance', 22000, 'vh_3', 'vn_1', 'Bank Transfer', null, 'Approved', now() - interval '5 days'),
  ('ex_3', 'EXP-0003', now() - interval '3 days', 'Salaries', 120000, null, null, 'Bank Transfer', null, 'Approved', now() - interval '3 days'),
  ('ex_4', 'EXP-0004', now() - interval '1 day', 'Insurance', 45000, 'vh_2', 'vn_2', 'Bank Transfer', null, 'Pending', now() - interval '1 day')
on conflict (id) do nothing;

-- Insurances
insert into insurances (id, vehicle_id, provider, policy_number, policy_type, coverage, start_date, expiry_date, premium, excess, status, created_at)
values
  ('ins_1', 'vh_1', 'Sri Insurance Co.', 'POL-001', 'Comprehensive', 'Full', now() - interval '120 days', now() + interval '20 days', 78000, 25000, 'Active', now() - interval '120 days'),
  ('ins_2', 'vh_2', 'Sri Insurance Co.', 'POL-002', 'Third Party', 'Third party only', now() - interval '200 days', now() + interval '10 days', 32000, 0, 'Active', now() - interval '200 days')
on conflict (id) do nothing;

-- Lease Contracts
insert into lease_contracts (id, lender, lease_number, vehicle_id, original_amount, down_payment, interest_rate, term_months, start_date, end_date, monthly_installment, next_due_date, outstanding_principal, status, created_at)
values
  ('ls_1', 'Commercial Bank', 'LC-2024-001', 'vh_3', 5200000, 1300000, 12, 48, now() - interval '400 days', now() + interval '440 days', 108000, now() + interval '3 days', 3200000, 'Active', now() - interval '400 days')
on conflict (id) do nothing;

-- Lease Payments
insert into lease_payments (id, lease_id, installment_no, due_date, amount, opening_balance, principal, interest, closing_balance, paid_date, bank_reference, status, paid_amount, created_at)
values
  ('lp_1', 'ls_1', 1, now() - interval '30 days', 108000, 3200000, 76000, 32000, 3124000, now() - interval '28 days', 'TRF-LP1', 'Paid', 108000, now() - interval '28 days'),
  ('lp_2', 'ls_1', 2, now() + interval '3 days', 108000, 3124000, 76760, 31240, 3047240, null, null, 'Pending', null, now() - interval '30 days')
on conflict (id) do nothing;

-- Maintenances
insert into maintenances (id, vehicle_id, type, service_date, odometer, work_performed, parts, labour_cost, parts_cost, vendor_id, total_cost, next_service_date, next_service_mileage, created_at)
values
  ('mt_1', 'vh_3', 'Corrective', now() - interval '5 days', 110000, 'Brake pad replacement', 'Brake pads', 8000, 14000, 'vn_1', 22000, now() + interval '180 days', 120000, now() - interval '5 days')
on conflict (id) do nothing;

-- Investor Transactions
insert into investor_transactions (id, investor_id, type, amount, date, notes, created_at)
values
  ('it_1', 'inv_1', 'Initial Capital', 5000000, now() - interval '800 days', 'Opening capital', now() - interval '800 days'),
  ('it_2', 'inv_2', 'Initial Capital', 3000000, now() - interval '800 days', 'Opening capital', now() - interval '800 days'),
  ('it_3', 'inv_3', 'Initial Capital', 2000000, now() - interval '200 days', 'Opening capital', now() - interval '200 days'),
  ('it_4', 'inv_1', 'Profit Paid', 250000, now() - interval '35 days', 'July profit', now() - interval '35 days'),
  ('it_5', 'inv_2', 'Profit Paid', 150000, now() - interval '35 days', 'July profit', now() - interval '35 days')
on conflict (id) do nothing;

-- Profit Allocations
insert into profit_allocations (id, period, investor_id, distributable_profit, share_pct, allocated_amount, status, date, created_at)
values
  ('pa_1', '2026-07', 'inv_1', 500000, 50, 250000, 'Paid', now() - interval '35 days', now() - interval '35 days'),
  ('pa_2', '2026-07', 'inv_2', 500000, 30, 150000, 'Paid', now() - interval '35 days', now() - interval '35 days'),
  ('pa_3', '2026-07', 'inv_3', 500000, 20, 100000, 'Draft', now() - interval '35 days', now() - interval '35 days')
on conflict (id) do nothing;

-- Settlements
insert into settlements (id, number, investor_id, period, amount, status, date, paid_date, bank_reference, created_at)
values
  ('st_1', 'STL-0001', 'inv_1', '2026-07', 250000, 'Paid', now() - interval '35 days', now() - interval '34 days', 'TRF-ST1', now() - interval '35 days'),
  ('st_2', 'STL-0002', 'inv_2', '2026-07', 150000, 'Paid', now() - interval '35 days', now() - interval '34 days', 'TRF-ST2', now() - interval '35 days')
on conflict (id) do nothing;

-- Reserve Transactions
insert into reserve_transactions (id, reserve_id, type, amount, date, notes, created_at)
values
  ('rt_1', 'ra_1', 'Contribution', 20000, now() - interval '30 days', 'Monthly contribution', now() - interval '30 days'),
  ('rt_2', 'ra_2', 'Contribution', 18000, now() - interval '30 days', '5% of revenue', now() - interval '30 days')
on conflict (id) do nothing;

-- Bank Transactions
insert into bank_transactions (id, account_id, type, amount, date, reference, notes, created_at)
values
  ('bt_1', 'ba_1', 'Deposit', 16500, now() - interval '2 days', 'PAY-0001', 'Booking BK-0001', now() - interval '2 days'),
  ('bt_2', 'ba_2', 'Deposit', 15000, now() - interval '5 days', 'TRF-001', 'Ceylon Tours', now() - interval '5 days'),
  ('bt_3', 'ba_2', 'Withdrawal', 120000, now() - interval '3 days', 'SAL', 'Salaries', now() - interval '3 days')
on conflict (id) do nothing;

-- Documents (Invoices)
insert into documents (id, number, type, booking_id, customer_id, date, subtotal, tax_amount, total, paid_amount, balance, created_at)
values
  ('dc_1', 'INV-0001', 'Invoice', 'bk_3', 'cu_corp1', now() - interval '5 days', 15000, 0, 15000, 15000, 0, now() - interval '5 days'),
  ('dc_2', 'INV-0002', 'Invoice', 'bk_1', 'cu_1', now() - interval '2 days', 16500, 0, 16500, 16500, 0, now() - interval '2 days')
on conflict (id) do nothing;

-- Notifications
insert into notifications (id, type, channel, subject, message, scheduled_at, sent_at, status, read, created_at)
values
  ('nt_1', 'Insurance Expiry', 'Popup', 'Insurance expiring soon', 'CAR-5678 insurance expires in 10 days', now(), now() - interval '2 hours', 'Read', true, now() - interval '2 hours'),
  ('nt_2', 'Booking Reminder', 'Popup', 'Pickup tomorrow', 'BK-0002 pickup in 20 hours', now() + interval '20 hours', null, 'Pending', false, now() - interval '1 day'),
  ('nt_3', 'Lease Due', 'Email', 'Lease payment due', 'LC-2024-001 installment due in 3 days', now() + interval '3 days', null, 'Pending', false, now() - interval '1 day'),
  ('nt_4', 'Overdue Rental', 'SMS', 'Vehicle overdue', 'BK-0004 vehicle CAR-1234 overdue', now() - interval '12 hours', now() - interval '12 hours', 'Sent', false, now() - interval '12 hours')
on conflict (id) do nothing;

-- Notification Templates
insert into notification_templates (id, type, name, channel, subject, body, created_at)
values
  ('ntm_1', 'Booking Confirmation', 'Booking Confirmation', 'Email', 'Your booking is confirmed', 'Dear customer, your booking {{booking_number}} is confirmed.', now() - interval '100 days'),
  ('ntm_2', 'Insurance Expiry', 'Insurance Expiry', 'Popup', 'Insurance expiring', 'Vehicle {{vehicle}} insurance expires on {{date}}.', now() - interval '100 days')
on conflict (id) do nothing;

-- Vehicle Documents
insert into vehicle_documents (id, vehicle_id, type, reference, issue_date, expiry_date, created_at)
values
  ('vd_1', 'vh_1', 'Insurance', 'INS-001', now() - interval '120 days', now() + interval '20 days', now() - interval '120 days'),
  ('vd_2', 'vh_1', 'Revenue License', 'RL-001', now() - interval '60 days', now() + interval '305 days', now() - interval '60 days'),
  ('vd_3', 'vh_2', 'Insurance', 'INS-002', now() - interval '200 days', now() + interval '10 days', now() - interval '200 days'),
  ('vd_4', 'vh_3', 'Emission', 'EM-003', now() - interval '300 days', now() - interval '5 days', now() - interval '300 days')
on conflict (id) do nothing;
