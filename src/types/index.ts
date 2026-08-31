// RentFlow domain types — frontend-only, designed to mirror future Supabase tables.

export type ID = string;
export type ISODate = string; // ISO datetime string

export type Currency = 'LKR' | 'USD' | 'EUR' | 'GBP';

export type VehicleStatus =
  | 'Available' | 'Reserved' | 'Rented' | 'Inspection'
  | 'Maintenance' | 'Accident' | 'Repair' | 'Inactive' | 'Sold';

export type BookingStatus =
  | 'Inquiry' | 'Reserved' | 'Confirmed' | 'Active'
  | 'Due Return' | 'Overdue' | 'Completed' | 'Cancelled' | 'No-show';

export type PaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Refunded' | 'Failed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Online Gateway' | 'Cheque' | 'Other';

export type CustomerType = 'Individual' | 'Corporate';
export type CustomerStatus = 'Active' | 'Blacklisted' | 'Inactive';

export type InvestorStatus = 'Active' | 'Inactive';

export type InvestorTxnType =
  | 'Initial Capital' | 'Additional Capital' | 'Capital Return'
  | 'Profit Allocation' | 'Profit Paid' | 'Loss Allocation'
  | 'Drawings' | 'Adjustment';

export type ExpenseCategory =
  | 'Leasing' | 'Insurance' | 'Fuel' | 'Maintenance' | 'Repair'
  | 'Cleaning' | 'Marketing' | 'Bank Fees' | 'Salaries' | 'Utilities'
  | 'Parking' | 'Tolls' | 'Office' | 'Taxes' | 'Driver Allowance' | 'Other';

export type LeaseStatus = 'Active' | 'Completed' | 'Defaulted';
export type InsuranceStatus = 'Active' | 'Expired' | 'Claim in Progress';
export type MaintenanceType =
  | 'Preventive' | 'Corrective' | 'Oil Change' | 'Tyres' | 'Battery'
  | 'Brake' | 'Engine' | 'Transmission' | 'AC' | 'Cleaning' | 'Other';

export type SettlementStatus =
  | 'Draft' | 'Pending Approval' | 'Approved' | 'Paid' | 'Reconciled' | 'Cancelled';

export type ReserveType = 'Insurance' | 'Maintenance' | 'Emergency' | 'Lease';
export type ReserveContributionMethod = 'Fixed' | 'Percent Revenue' | 'Percent Profit' | 'Manual';

export type DocumentType =
  | 'Invoice' | 'Receipt' | 'Tax Invoice' | 'Payment Receipt'
  | 'Rental Agreement' | 'Deposit Receipt' | 'Refund Receipt'
  | 'Damage Charge' | 'Corporate Consolidated';

export type NotificationChannel = 'Popup' | 'Email' | 'SMS' | 'Push' | 'WhatsApp';
export type NotificationStatus = 'Pending' | 'Sent' | 'Failed' | 'Read';

export type UserRole =
  | 'Super Admin' | 'Owner' | 'Manager' | 'Accountant'
  | 'Rental Staff' | 'Driver' | 'Corporate Contact';

// Role-based access control (RBAC)
// Each module (identified by NavItem.key) has granular action permissions.
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

// Map of module key -> permissions. Modules not listed are treated as no access.
export type UserPermissions = Record<string, ModulePermissions>;

export interface Branch {
  id: ID;
  name: string;
  address?: string;
  phone?: string;
  createdAt: ISODate;
}

export interface Vehicle {
  id: ID;
  regNumber: string;
  vin?: string;
  engineNumber?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  transmission?: 'Manual' | 'Auto' | 'CVT';
  fuelType?: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | 'CNG';
  seatingCapacity?: number;
  mileage: number;
  purchaseDate?: ISODate;
  purchasePrice?: number;
  bookValue?: number;
  branchId?: ID;
  status: VehicleStatus;
  notes?: string;
  photoUrl?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface VehicleDocument {
  id: ID;
  vehicleId: ID;
  type: 'Registration' | 'Insurance' | 'Revenue License' | 'Emission' | 'Lease' | 'Other';
  reference?: string;
  issueDate?: ISODate;
  expiryDate?: ISODate;
  notes?: string;
  createdAt: ISODate;
}

export interface Customer {
  id: ID;
  type: CustomerType;
  // individual
  fullName?: string;
  nic?: string;
  drivingLicense?: string;
  drivingLicenseExpiry?: ISODate;
  dateOfBirth?: ISODate;
  // corporate
  companyName?: string;
  businessRegNumber?: string;
  creditTermsDays?: number;
  creditLimit?: number;
  authorizedDrivers?: string[];
  contacts?: { name: string; phone: string; email?: string }[];
  // shared
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  status: CustomerStatus;
  notes?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Driver {
  id: ID;
  fullName: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: ISODate;
  address?: string;
  status: 'Active' | 'Inactive';
  createdAt: ISODate;
}

export interface BookingDocument {
  id: ID;
  name: string;
  type: string; // e.g. "NIC", "Driving License", "Passport", "Other"
  dataUrl: string; // base64 data URL
  uploadedAt: ISODate;
}

export interface Booking {
  id: ID;
  number: string;
  customerId: ID;
  vehicleId: ID;
  driverId?: ID;
  rentalType: 'Rent' | 'Hire'; // Rent = self-drive, Hire = with chauffeur
  pickupAt: ISODate;
  returnAt: ISODate;
  pickupLocation?: string;
  returnLocation?: string;
  rentalDays: number;
  dailyRate: number;
  extraKmRate?: number;
  includedKm?: number;
  includedKmPerDay?: boolean; // if true, includedKm is per day; total = includedKm * rentalDays
  fuelPolicy?: 'Full-to-Full' | 'Prepaid' | 'Same Level';
  deposit: number;
  discount?: number;
  taxRate?: number; // percent
  additionalCharges?: number;
  status: BookingStatus;
  notes?: string;
  // Odometer / KM tracking
  pickupOdometer?: number; // km at handover
  returnOdometer?: number; // km at return
  odometerPhotoOut?: string; // base64 photo of meter at pickup
  odometerPhotoIn?: string; // base64 photo of meter at return
  // Customer documents uploaded with this booking
  customerDocuments?: BookingDocument[];
  // Computed at return
  kmUsed?: number;
  extraKm?: number;
  extraKmCharge?: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Inspection {
  id: ID;
  bookingId: ID;
  type: 'Handover' | 'Return';
  mileage: number;
  fuelLevel: number; // 0-100
  exteriorCondition?: string;
  interiorCondition?: string;
  tyreCondition?: string;
  accessories?: string;
  existingDamage?: string;
  newDamage?: string;
  missingAccessories?: string;
  photos?: string[];
  damagePhotos?: string[]; // base64 photos of damage (return inspection)
  hasDamage?: boolean; // checkbox: is there new damage?
  customerSignature?: string;
  staffSignature?: string;
  lateFee?: number;
  fuelCharge?: number;
  damageCharge?: number;
  cleaningCharge?: number;
  extraKmCharge?: number;
  performedAt: ISODate;
  performedBy?: string;
}

export interface Payment {
  id: ID;
  number: string;
  bookingId?: ID;
  customerId?: ID;
  amount: number;
  date: ISODate;
  method: PaymentMethod;
  reference?: string;
  receivedBy?: string;
  notes?: string;
  gatewayTxnId?: string;
  isDeposit?: boolean;
  status: PaymentStatus;
  createdAt: ISODate;
}

export interface Deposit {
  id: ID;
  bookingId: ID;
  customerId: ID;
  required: number;
  received: number;
  method?: PaymentMethod;
  deductions?: number;
  refundAmount?: number;
  refundDate?: ISODate;
  refundMethod?: PaymentMethod;
  deductionReason?: string;
  status: 'Held' | 'Partially Refunded' | 'Refunded' | 'Forfeited';
  createdAt: ISODate;
}

export interface Document {
  id: ID;
  number: string;
  type: DocumentType;
  bookingId?: ID;
  customerId?: ID;
  corporateAccountId?: ID;
  date: ISODate;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  notes?: string;
  voided?: boolean;
  createdAt: ISODate;
}

export interface Expense {
  id: ID;
  number: string;
  date: ISODate;
  category: ExpenseCategory;
  amount: number;
  vehicleId?: ID;
  branchId?: ID;
  vendorId?: ID;
  paidBy?: string;
  method?: PaymentMethod;
  reference?: string;
  receiptUrl?: string;
  notes?: string;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  taxAmount?: number;
  recurring?: boolean;
  createdAt: ISODate;
}

export interface Vendor {
  id: ID;
  name: string;
  type: 'Garage' | 'Insurance' | 'Bank' | 'Supplier' | 'Cleaning' | 'Parts' | 'Other';
  phone?: string;
  email?: string;
  address?: string;
  outstandingBalance?: number;
  createdAt: ISODate;
}

export interface LeaseContract {
  id: ID;
  lender?: string;
  leaseNumber?: string;
  vehicleId: ID;
  originalAmount: number;
  downPayment?: number;
  interestRate?: number;
  termMonths?: number;
  startDate: ISODate;
  endDate?: ISODate;
  monthlyInstallment: number;
  nextDueDate?: ISODate;
  outstandingPrincipal: number;
  status: LeaseStatus;
  createdAt: ISODate;
}

export interface LeasePayment {
  id: ID;
  leaseId: ID;
  installmentNo: number; // 1-based position in the amortization schedule
  dueDate: ISODate;
  amount: number; // monthly payment (principal + interest)
  openingBalance?: number; // principal remaining before this payment
  principal?: number; // principal portion of this payment
  interest?: number; // interest portion of this payment
  closingBalance?: number; // principal remaining after this payment
  paidDate?: ISODate;
  bankReference?: string;
  receiptUrl?: string;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Partial';
  paidAmount?: number;
  createdAt: ISODate;
}

export interface Insurance {
  id: ID;
  vehicleId: ID;
  provider?: string;
  policyNumber?: string;
  policyType?: string;
  coverage?: string;
  startDate: ISODate;
  expiryDate: ISODate;
  premium: number;
  excess?: number;
  status: InsuranceStatus;
  createdAt: ISODate;
}

export interface InsuranceClaim {
  id: ID;
  insuranceId: ID;
  date: ISODate;
  claimAmount: number;
  status: 'Filed' | 'Under Review' | 'Approved' | 'Settled' | 'Rejected';
  settlementAmount?: number;
  notes?: string;
  createdAt: ISODate;
}

export interface Maintenance {
  id: ID;
  vehicleId: ID;
  type: MaintenanceType;
  serviceDate: ISODate;
  odometer: number;
  workPerformed?: string;
  parts?: string;
  labourCost?: number;
  partsCost?: number;
  vendorId?: ID;
  totalCost: number;
  nextServiceDate?: ISODate;
  nextServiceMileage?: number;
  notes?: string;
  createdAt: ISODate;
}

export interface Investor {
  id: ID;
  fullName: string;
  nic?: string;
  address?: string;
  phone?: string;
  email?: string;
  joinDate: ISODate;
  investmentAmount: number;
  ownershipPct: number;
  profitSharePct: number;
  capitalBalance: number;
  status: InvestorStatus;
  bankDetails?: string;
  notes?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface InvestorTransaction {
  id: ID;
  investorId: ID;
  type: InvestorTxnType;
  amount: number;
  date: ISODate;
  notes?: string;
  reference?: string;
  createdAt: ISODate;
}

export interface ProfitAllocation {
  id: ID;
  period: string; // e.g. "2026-08"
  investorId: ID;
  distributableProfit: number;
  sharePct: number;
  allocatedAmount: number;
  status: 'Draft' | 'Approved' | 'Paid';
  date: ISODate;
  createdAt: ISODate;
}

export interface ReserveAccount {
  id: ID;
  type: ReserveType;
  name: string;
  openingBalance: number;
  currentBalance: number;
  monthlyTarget?: number;
  contributionMethod: ReserveContributionMethod;
  contributionValue?: number;
  createdAt: ISODate;
}

export interface ReserveTransaction {
  id: ID;
  reserveId: ID;
  type: 'Contribution' | 'Withdrawal' | 'Transfer';
  amount: number;
  date: ISODate;
  notes?: string;
  createdAt: ISODate;
}

export interface Settlement {
  id: ID;
  number: string;
  investorId: ID;
  period: string;
  amount: number;
  status: SettlementStatus;
  date: ISODate;
  paidDate?: ISODate;
  bankReference?: string;
  notes?: string;
  createdAt: ISODate;
}

export interface BankAccount {
  id: ID;
  name: string;
  type: 'Cash' | 'Bank' | 'Card Settlement' | 'Online Gateway' | 'Investor Payable' | 'Reserve';
  openingBalance: number;
  currentBalance: number;
  bankName?: string;
  accountNumber?: string;
  createdAt: ISODate;
}

export interface BankTransaction {
  id: ID;
  accountId: ID;
  type: 'Deposit' | 'Withdrawal' | 'Transfer';
  amount: number;
  date: ISODate;
  reference?: string;
  notes?: string;
  createdAt: ISODate;
}

export interface Notification {
  id: ID;
  type: string;
  channel: NotificationChannel;
  recipient?: string;
  subject: string;
  message: string;
  scheduledAt: ISODate;
  sentAt?: ISODate;
  status: NotificationStatus;
  failureReason?: string;
  read?: boolean;
  createdAt: ISODate;
}

export interface NotificationTemplate {
  id: ID;
  type: string;
  name: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  createdAt: ISODate;
}

export interface AuditLog {
  id: ID;
  user: string;
  action: string;
  entity: string;
  entityId?: ID;
  before?: string;
  after?: string;
  timestamp: ISODate;
  ip?: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  permissions?: UserPermissions; // per-module action permissions (RBAC)
  active: boolean;
  lastLogin?: ISODate;
  createdAt: ISODate;
}

export interface SystemSettings {
  businessName: string;
  logoUrl?: string;
  address?: string;
  taxRegNumber?: string;
  defaultCurrency: Currency;
  taxRate: number;
  invoicePrefix: string;
  invoiceSeq: number;
  receiptPrefix: string;
  receiptSeq: number;
  bookingPrefix: string;
  bookingSeq: number;
  paymentPrefix: string;
  paymentSeq: number;
  expensePrefix: string;
  expenseSeq: number;
  settlementPrefix: string;
  settlementSeq: number;
  language: 'en' | 'si' | 'ta';
  calendarColors: Record<string, string>;
  reminderDefaults: Record<string, string[]>;
  googleCalendarEmail?: string; // Google account email for calendar sync
  googleCalendarSync?: boolean; // Enable auto-sync to Google Calendar
}

export interface Database {
  branches: Branch[];
  vehicles: Vehicle[];
  vehicleDocuments: VehicleDocument[];
  customers: Customer[];
  drivers: Driver[];
  bookings: Booking[];
  inspections: Inspection[];
  payments: Payment[];
  deposits: Deposit[];
  documents: Document[];
  expenses: Expense[];
  vendors: Vendor[];
  leaseContracts: LeaseContract[];
  leasePayments: LeasePayment[];
  insurances: Insurance[];
  insuranceClaims: InsuranceClaim[];
  maintenances: Maintenance[];
  investors: Investor[];
  investorTransactions: InvestorTransaction[];
  profitAllocations: ProfitAllocation[];
  reserveAccounts: ReserveAccount[];
  reserveTransactions: ReserveTransaction[];
  settlements: Settlement[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  notifications: Notification[];
  notificationTemplates: NotificationTemplate[];
  auditLogs: AuditLog[];
  users: User[];
  settings: SystemSettings;
}
