-- 0002_enums.sql
-- All enum types mirroring src/types/index.ts.
-- Values are kept as-is (PascalCase / human-readable) to match the frontend.

do $$ begin
  create type vehicle_status as enum ('Available','Reserved','Rented','Inspection','Maintenance','Accident','Repair','Inactive','Sold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('Inquiry','Reserved','Confirmed','Active','Due Return','Overdue','Completed','Cancelled','No-show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('Pending','Partially Paid','Paid','Refunded','Failed','Cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('Cash','Card','Bank Transfer','Online Gateway','Cheque','Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type customer_type as enum ('Individual','Corporate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type customer_status as enum ('Active','Blacklisted','Inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type investor_status as enum ('Active','Inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type investor_txn_type as enum ('Initial Capital','Additional Capital','Capital Return','Profit Allocation','Profit Paid','Loss Allocation','Drawings','Adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_category as enum ('Leasing','Insurance','Fuel','Maintenance','Repair','Cleaning','Marketing','Bank Fees','Salaries','Utilities','Parking','Tolls','Office','Taxes','Driver Allowance','Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lease_status as enum ('Active','Completed','Defaulted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type insurance_status as enum ('Active','Expired','Claim in Progress');
exception when duplicate_object then null; end $$;

do $$ begin
  create type maintenance_type as enum ('Preventive','Corrective','Oil Change','Tyres','Battery','Brake','Engine','Transmission','AC','Cleaning','Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type settlement_status as enum ('Draft','Pending Approval','Approved','Paid','Reconciled','Cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reserve_type as enum ('Insurance','Maintenance','Emergency','Lease');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reserve_contribution_method as enum ('Fixed','Percent Revenue','Percent Profit','Manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_type as enum ('Invoice','Receipt','Tax Invoice','Payment Receipt','Rental Agreement','Deposit Receipt','Refund Receipt','Damage Charge','Corporate Consolidated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel as enum ('Popup','Email','SMS','Push','WhatsApp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum ('Pending','Sent','Failed','Read');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('Super Admin','Owner','Manager','Accountant','Rental Staff','Driver','Corporate Contact');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transmission_type as enum ('Manual','Auto','CVT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fuel_type as enum ('Petrol','Diesel','Hybrid','Electric','CNG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rental_type as enum ('Rent','Hire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fuel_policy as enum ('Full-to-Full','Prepaid','Same Level');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deposit_status as enum ('Held','Partially Refunded','Refunded','Forfeited');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lease_payment_status as enum ('Pending','Paid','Overdue','Partial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type insurance_claim_status as enum ('Filed','Under Review','Approved','Settled','Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type driver_status as enum ('Active','Inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_approval_status as enum ('Pending','Approved','Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type profit_allocation_status as enum ('Draft','Approved','Paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bank_account_type as enum ('Cash','Bank','Card Settlement','Online Gateway','Investor Payable','Reserve');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bank_txn_type as enum ('Deposit','Withdrawal','Transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reserve_txn_type as enum ('Contribution','Withdrawal','Transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vehicle_document_type as enum ('Registration','Insurance','Revenue License','Emission','Lease','Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inspection_type as enum ('Handover','Return');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vendor_type as enum ('Garage','Insurance','Bank','Supplier','Cleaning','Parts','Other');
exception when duplicate_object then null; end $$;
