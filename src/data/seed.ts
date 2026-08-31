import type { Database } from '../types';
import { uid } from '../lib/utils';
import { fullPermissions, emptyPermissions } from '../lib/permissions';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000));
const daysAhead = (n: number) => iso(new Date(now.getTime() + n * 86400000));
const hoursAhead = (n: number) => iso(new Date(now.getTime() + n * 3600000));
const hoursAgo = (n: number) => iso(new Date(now.getTime() - n * 3600000));

const b1 = uid('br');
const v1 = uid('vh');
const v2 = uid('vh');
const v3 = uid('vh');
const v4 = uid('vh');
const c1 = uid('cu');
const c2 = uid('cu');
const c3 = uid('cu');
const corp1 = uid('cu');
const d1 = uid('dr');
const inv1 = uid('inv');
const inv2 = uid('inv');
const inv3 = uid('inv');
const bk1 = uid('bk');
const bk2 = uid('bk');
const bk3 = uid('bk');
const bk4 = uid('bk');
const lease1 = uid('ls');
const ins1 = uid('ins');
const ins2 = uid('ins');
const maint1 = uid('mt');
const vend1 = uid('vn');
const vend2 = uid('vn');
const ba1 = uid('ba');
const ba2 = uid('ba');
const ra1 = uid('ra');
const ra2 = uid('ra');
const ra3 = uid('ra');

export function seedDatabase(): Database {
  return {
    branches: [
      { id: b1, name: 'Main Branch', address: 'Colombo 03', phone: '+94 11 234 5678', createdAt: daysAgo(400) },
    ],
    vehicles: [
      { id: v1, regNumber: 'CAR-1234', vin: 'JTDBR32E830000001', make: 'Toyota', model: 'Aqua', year: 2018, color: 'Silver', transmission: 'Auto', fuelType: 'Hybrid', seatingCapacity: 5, mileage: 85000, purchaseDate: daysAgo(800), purchasePrice: 4200000, bookValue: 3500000, branchId: b1, status: 'Rented', createdAt: daysAgo(800), updatedAt: daysAgo(2) },
      { id: v2, regNumber: 'CAR-5678', make: 'Suzuki', model: 'Wagon R', year: 2020, color: 'White', transmission: 'Auto', fuelType: 'Petrol', seatingCapacity: 5, mileage: 42000, purchasePrice: 3800000, bookValue: 3200000, branchId: b1, status: 'Available', createdAt: daysAgo(500), updatedAt: daysAgo(1) },
      { id: v3, regNumber: 'VAN-9012', make: 'Nissan', model: 'NV200', year: 2019, color: 'Blue', transmission: 'Manual', fuelType: 'Diesel', seatingCapacity: 7, mileage: 110000, purchasePrice: 6500000, bookValue: 5200000, branchId: b1, status: 'Maintenance', createdAt: daysAgo(700), updatedAt: daysAgo(5) },
      { id: v4, regNumber: 'SUV-3456', make: 'Honda', model: 'Vezel', year: 2017, color: 'Black', transmission: 'CVT', fuelType: 'Hybrid', seatingCapacity: 5, mileage: 130000, purchasePrice: 5800000, bookValue: 4100000, branchId: b1, status: 'Available', createdAt: daysAgo(900), updatedAt: daysAgo(3) },
    ],
    vehicleDocuments: [
      { id: uid('vd'), vehicleId: v1, type: 'Insurance', reference: 'INS-001', issueDate: daysAgo(120), expiryDate: daysAhead(20), createdAt: daysAgo(120) },
      { id: uid('vd'), vehicleId: v1, type: 'Revenue License', reference: 'RL-001', issueDate: daysAgo(60), expiryDate: daysAhead(305), createdAt: daysAgo(60) },
      { id: uid('vd'), vehicleId: v2, type: 'Insurance', reference: 'INS-002', issueDate: daysAgo(200), expiryDate: daysAhead(10), createdAt: daysAgo(200) },
      { id: uid('vd'), vehicleId: v3, type: 'Emission', reference: 'EM-003', issueDate: daysAgo(300), expiryDate: daysAgo(5), createdAt: daysAgo(300) },
    ],
    customers: [
      { id: c1, type: 'Individual', fullName: 'Amal Perera', nic: '901234567V', drivingLicense: 'B1234567', drivingLicenseExpiry: daysAhead(400), phone: '+94 77 123 4567', email: 'amal@example.com', address: 'Colombo 05', emergencyContact: '+94 71 999 8888', status: 'Active', createdAt: daysAgo(200), updatedAt: daysAgo(10) },
      { id: c2, type: 'Individual', fullName: 'Nimal Silva', nic: '887654321V', drivingLicense: 'B7654321', drivingLicenseExpiry: daysAhead(60), phone: '+94 71 555 4444', email: 'nimal@example.com', address: 'Kandy', status: 'Active', createdAt: daysAgo(150), updatedAt: daysAgo(20) },
      { id: c3, type: 'Individual', fullName: 'Kasun Fernando', phone: '+94 76 222 3333', status: 'Blacklisted', notes: 'Late return + damage history', createdAt: daysAgo(300), updatedAt: daysAgo(50) },
      { id: corp1, type: 'Corporate', companyName: 'Ceylon Tours Ltd', businessRegNumber: 'PV-12345', creditTermsDays: 30, creditLimit: 500000, authorizedDrivers: ['Saman', 'Ruwan'], contacts: [{ name: 'Finance', phone: '+94 11 444 5566', email: 'finance@ceylontours.lk' }], address: 'Colombo 02', phone: '+94 11 444 5566', status: 'Active', createdAt: daysAgo(120), updatedAt: daysAgo(15) },
    ],
    drivers: [
      { id: d1, fullName: 'Sunil Bandara', phone: '+94 77 888 9999', licenseNumber: 'D112233', licenseExpiry: daysAhead(250), status: 'Active', createdAt: daysAgo(180) },
    ],
    bookings: [
      { id: bk1, number: 'BK-0001', customerId: c1, vehicleId: v1, driverId: undefined, rentalType: 'Rent', pickupAt: daysAgo(2), returnAt: daysAhead(1), rentalDays: 3, dailyRate: 5500, extraKmRate: 12, includedKm: 300, fuelPolicy: 'Full-to-Full', deposit: 20000, taxRate: 0, status: 'Active', notes: '', pickupOdometer: 84500, createdAt: daysAgo(5), updatedAt: daysAgo(2) },
      { id: bk2, number: 'BK-0002', customerId: c2, vehicleId: v2, rentalType: 'Rent', pickupAt: hoursAhead(20), returnAt: daysAhead(4), rentalDays: 3, dailyRate: 4800, deposit: 15000, taxRate: 0, status: 'Confirmed', createdAt: daysAgo(1), updatedAt: daysAgo(1) },
      { id: bk3, number: 'BK-0003', customerId: corp1, vehicleId: v4, driverId: d1, rentalType: 'Hire', pickupAt: daysAgo(6), returnAt: daysAgo(5), rentalDays: 2, dailyRate: 7500, deposit: 0, taxRate: 0, status: 'Completed', pickupOdometer: 129000, returnOdometer: 129400, kmUsed: 400, createdAt: daysAgo(10), updatedAt: daysAgo(5) },
      { id: bk4, number: 'BK-0004', customerId: c1, vehicleId: v3, rentalType: 'Rent', pickupAt: daysAgo(10), returnAt: daysAgo(7), rentalDays: 3, dailyRate: 9000, deposit: 30000, taxRate: 0, status: 'Overdue', notes: 'Vehicle not returned', pickupOdometer: 109500, createdAt: daysAgo(15), updatedAt: daysAgo(7) },
    ],
    inspections: [
      { id: uid('in'), bookingId: bk1, type: 'Handover', mileage: 84500, fuelLevel: 100, exteriorCondition: 'Good', interiorCondition: 'Clean', tyreCondition: 'Good', accessories: 'Spare tyre, jack, tools', existingDamage: 'Minor scratch on rear bumper', performedAt: daysAgo(2), performedBy: 'Staff' },
      { id: uid('in'), bookingId: bk3, type: 'Handover', mileage: 129000, fuelLevel: 100, exteriorCondition: 'Good', performedAt: daysAgo(6), performedBy: 'Staff' },
      { id: uid('in'), bookingId: bk3, type: 'Return', mileage: 129400, fuelLevel: 80, exteriorCondition: 'Good', newDamage: 'None', performedAt: daysAgo(5), performedBy: 'Staff', extraKmCharge: 0 },
    ],
    payments: [
      { id: uid('pm'), number: 'PAY-0001', bookingId: bk1, customerId: c1, amount: 16500, date: daysAgo(2), method: 'Cash', receivedBy: 'Staff', status: 'Paid', createdAt: daysAgo(2) },
      { id: uid('pm'), number: 'PAY-0002', bookingId: bk1, customerId: c1, amount: 20000, date: daysAgo(2), method: 'Cash', isDeposit: true, status: 'Held' as any, createdAt: daysAgo(2) },
      { id: uid('pm'), number: 'PAY-0003', bookingId: bk3, customerId: corp1, amount: 15000, date: daysAgo(5), method: 'Bank Transfer', reference: 'TRF-001', status: 'Paid', createdAt: daysAgo(5) },
      { id: uid('pm'), number: 'PAY-0004', bookingId: bk4, customerId: c1, amount: 27000, date: daysAgo(10), method: 'Card', status: 'Paid', createdAt: daysAgo(10) },
    ],
    deposits: [
      { id: uid('dp'), bookingId: bk1, customerId: c1, required: 20000, received: 20000, method: 'Cash', status: 'Held', createdAt: daysAgo(2) },
      { id: uid('dp'), bookingId: bk4, customerId: c1, required: 30000, received: 30000, method: 'Card', status: 'Held', createdAt: daysAgo(10) },
    ],
    documents: [
      { id: uid('dc'), number: 'INV-0001', type: 'Invoice', bookingId: bk3, customerId: corp1, date: daysAgo(5), subtotal: 15000, taxAmount: 0, total: 15000, paidAmount: 15000, balance: 0, createdAt: daysAgo(5) },
      { id: uid('dc'), number: 'INV-0002', type: 'Invoice', bookingId: bk1, customerId: c1, date: daysAgo(2), subtotal: 16500, taxAmount: 0, total: 16500, paidAmount: 16500, balance: 0, createdAt: daysAgo(2) },
    ],
    expenses: [
      { id: uid('ex'), number: 'EXP-0001', date: daysAgo(8), category: 'Fuel', amount: 8500, vehicleId: v1, method: 'Cash', notes: 'Refill', approvalStatus: 'Approved', createdAt: daysAgo(8) },
      { id: uid('ex'), number: 'EXP-0002', date: daysAgo(5), category: 'Maintenance', amount: 22000, vehicleId: v3, vendorId: vend1, method: 'Bank Transfer', reference: 'TRF-MT', approvalStatus: 'Approved', createdAt: daysAgo(5) },
      { id: uid('ex'), number: 'EXP-0003', date: daysAgo(3), category: 'Salaries', amount: 120000, method: 'Bank Transfer', approvalStatus: 'Approved', createdAt: daysAgo(3) },
      { id: uid('ex'), number: 'EXP-0004', date: daysAgo(1), category: 'Insurance', amount: 45000, vehicleId: v2, vendorId: vend2, method: 'Bank Transfer', approvalStatus: 'Pending', createdAt: daysAgo(1) },
    ],
    vendors: [
      { id: vend1, name: 'Auto Care Garage', type: 'Garage', phone: '+94 11 333 2222', outstandingBalance: 0, createdAt: daysAgo(300) },
      { id: vend2, name: 'Sri Insurance Co.', type: 'Insurance', phone: '+94 11 555 6677', outstandingBalance: 45000, createdAt: daysAgo(300) },
    ],
    leaseContracts: [
      { id: lease1, lender: 'Commercial Bank', leaseNumber: 'LC-2024-001', vehicleId: v3, originalAmount: 5200000, downPayment: 1300000, interestRate: 12, termMonths: 48, startDate: daysAgo(400), endDate: daysAhead(440), monthlyInstallment: 108000, nextDueDate: daysAhead(3), outstandingPrincipal: 3200000, status: 'Active', createdAt: daysAgo(400) },
    ],
    leasePayments: [
      { id: uid('lp'), leaseId: lease1, installmentNo: 1, dueDate: daysAgo(30), amount: 108000, openingBalance: 3200000, principal: 76000, interest: 32000, closingBalance: 3124000, paidDate: daysAgo(28), bankReference: 'TRF-LP1', status: 'Paid', paidAmount: 108000, createdAt: daysAgo(28) },
      { id: uid('lp'), leaseId: lease1, installmentNo: 2, dueDate: daysAhead(3), amount: 108000, openingBalance: 3124000, principal: 76760, interest: 31240, closingBalance: 3047240, status: 'Pending', createdAt: daysAgo(30) },
    ],
    insurances: [
      { id: ins1, vehicleId: v1, provider: 'Sri Insurance Co.', policyNumber: 'POL-001', policyType: 'Comprehensive', coverage: 'Full', startDate: daysAgo(120), expiryDate: daysAhead(20), premium: 78000, excess: 25000, status: 'Active', createdAt: daysAgo(120) },
      { id: ins2, vehicleId: v2, provider: 'Sri Insurance Co.', policyNumber: 'POL-002', policyType: 'Third Party', coverage: 'Third party only', startDate: daysAgo(200), expiryDate: daysAhead(10), premium: 32000, excess: 0, status: 'Active', createdAt: daysAgo(200) },
    ],
    insuranceClaims: [
      { id: uid('ic'), insuranceId: ins1, date: daysAgo(60), claimAmount: 45000, status: 'Settled', settlementAmount: 40000, notes: 'Minor body repair', createdAt: daysAgo(60) },
    ],
    maintenances: [
      { id: maint1, vehicleId: v3, type: 'Corrective', serviceDate: daysAgo(5), odometer: 110000, workPerformed: 'Brake pad replacement', parts: 'Brake pads', labourCost: 8000, partsCost: 14000, vendorId: vend1, totalCost: 22000, nextServiceDate: daysAhead(180), nextServiceMileage: 120000, createdAt: daysAgo(5) },
    ],
    investors: [
      { id: inv1, fullName: 'Ravi Investor', nic: '700000001V', phone: '+94 77 100 0001', email: 'ravi@example.com', joinDate: daysAgo(800), investmentAmount: 5000000, ownershipPct: 50, profitSharePct: 50, capitalBalance: 5000000, status: 'Active', bankDetails: 'Commercial Bank ****1234', createdAt: daysAgo(800), updatedAt: daysAgo(30) },
      { id: inv2, fullName: 'Nisha Investor', nic: '750000002V', phone: '+94 77 100 0002', email: 'nisha@example.com', joinDate: daysAgo(800), investmentAmount: 3000000, ownershipPct: 30, profitSharePct: 30, capitalBalance: 3000000, status: 'Active', createdAt: daysAgo(800), updatedAt: daysAgo(30) },
      { id: inv3, fullName: 'Capital Partners Ltd', nic: 'PV-9000001', phone: '+94 11 200 0003', email: 'cp@example.com', joinDate: daysAgo(200), investmentAmount: 2000000, ownershipPct: 20, profitSharePct: 20, capitalBalance: 2000000, status: 'Active', createdAt: daysAgo(200), updatedAt: daysAgo(20) },
    ],
    investorTransactions: [
      { id: uid('it'), investorId: inv1, type: 'Initial Capital', amount: 5000000, date: daysAgo(800), notes: 'Opening capital', createdAt: daysAgo(800) },
      { id: uid('it'), investorId: inv2, type: 'Initial Capital', amount: 3000000, date: daysAgo(800), notes: 'Opening capital', createdAt: daysAgo(800) },
      { id: uid('it'), investorId: inv3, type: 'Initial Capital', amount: 2000000, date: daysAgo(200), notes: 'Opening capital', createdAt: daysAgo(200) },
      { id: uid('it'), investorId: inv1, type: 'Profit Paid', amount: 250000, date: daysAgo(35), notes: 'July profit', createdAt: daysAgo(35) },
      { id: uid('it'), investorId: inv2, type: 'Profit Paid', amount: 150000, date: daysAgo(35), notes: 'July profit', createdAt: daysAgo(35) },
    ],
    profitAllocations: [
      { id: uid('pa'), period: '2026-07', investorId: inv1, distributableProfit: 500000, sharePct: 50, allocatedAmount: 250000, status: 'Paid', date: daysAgo(35), createdAt: daysAgo(35) },
      { id: uid('pa'), period: '2026-07', investorId: inv2, distributableProfit: 500000, sharePct: 30, allocatedAmount: 150000, status: 'Paid', date: daysAgo(35), createdAt: daysAgo(35) },
      { id: uid('pa'), period: '2026-07', investorId: inv3, distributableProfit: 500000, sharePct: 20, allocatedAmount: 100000, status: 'Draft', date: daysAgo(35), createdAt: daysAgo(35) },
    ],
    reserveAccounts: [
      { id: ra1, type: 'Insurance', name: 'Insurance Reserve', openingBalance: 0, currentBalance: 120000, monthlyTarget: 20000, contributionMethod: 'Fixed', contributionValue: 20000, createdAt: daysAgo(365) },
      { id: ra2, type: 'Maintenance', name: 'Maintenance Reserve', openingBalance: 0, currentBalance: 85000, monthlyTarget: 15000, contributionMethod: 'Percent Revenue', contributionValue: 5, createdAt: daysAgo(365) },
      { id: ra3, type: 'Emergency', name: 'Emergency Reserve', openingBalance: 0, currentBalance: 50000, contributionMethod: 'Manual', createdAt: daysAgo(365) },
    ],
    reserveTransactions: [
      { id: uid('rt'), reserveId: ra1, type: 'Contribution', amount: 20000, date: daysAgo(30), notes: 'Monthly contribution', createdAt: daysAgo(30) },
      { id: uid('rt'), reserveId: ra2, type: 'Contribution', amount: 18000, date: daysAgo(30), notes: '5% of revenue', createdAt: daysAgo(30) },
    ],
    settlements: [
      { id: uid('st'), number: 'STL-0001', investorId: inv1, period: '2026-07', amount: 250000, status: 'Paid', date: daysAgo(35), paidDate: daysAgo(34), bankReference: 'TRF-ST1', createdAt: daysAgo(35) },
      { id: uid('st'), number: 'STL-0002', investorId: inv2, period: '2026-07', amount: 150000, status: 'Paid', date: daysAgo(35), paidDate: daysAgo(34), bankReference: 'TRF-ST2', createdAt: daysAgo(35) },
    ],
    bankAccounts: [
      { id: ba1, name: 'Cash on Hand', type: 'Cash', openingBalance: 100000, currentBalance: 245000, createdAt: daysAgo(365) },
      { id: ba2, name: 'Commercial Bank Main', type: 'Bank', bankName: 'Commercial Bank', accountNumber: '****1234', openingBalance: 1000000, currentBalance: 1840000, createdAt: daysAgo(365) },
    ],
    bankTransactions: [
      { id: uid('bt'), accountId: ba1, type: 'Deposit', amount: 16500, date: daysAgo(2), reference: 'PAY-0001', notes: 'Booking BK-0001', createdAt: daysAgo(2) },
      { id: uid('bt'), accountId: ba2, type: 'Deposit', amount: 15000, date: daysAgo(5), reference: 'TRF-001', notes: 'Ceylon Tours', createdAt: daysAgo(5) },
      { id: uid('bt'), accountId: ba2, type: 'Withdrawal', amount: 120000, date: daysAgo(3), reference: 'SAL', notes: 'Salaries', createdAt: daysAgo(3) },
    ],
    notifications: [
      { id: uid('nt'), type: 'Insurance Expiry', channel: 'Popup', subject: 'Insurance expiring soon', message: 'CAR-5678 insurance expires in 10 days', scheduledAt: daysAhead(0), sentAt: hoursAgo(2), status: 'Read', read: true, createdAt: hoursAgo(2) },
      { id: uid('nt'), type: 'Booking Reminder', channel: 'Popup', subject: 'Pickup tomorrow', message: 'BK-0002 pickup in 20 hours', scheduledAt: hoursAhead(20), status: 'Pending', createdAt: daysAgo(1) },
      { id: uid('nt'), type: 'Lease Due', channel: 'Email', subject: 'Lease payment due', message: 'LC-2024-001 installment due in 3 days', scheduledAt: daysAhead(3), status: 'Pending', createdAt: daysAgo(1) },
      { id: uid('nt'), type: 'Overdue Rental', channel: 'SMS', subject: 'Vehicle overdue', message: 'BK-0004 vehicle CAR-1234 overdue', scheduledAt: hoursAgo(12), sentAt: hoursAgo(12), status: 'Sent', createdAt: hoursAgo(12) },
    ],
    notificationTemplates: [
      { id: uid('ntm'), type: 'Booking Confirmation', name: 'Booking Confirmation', channel: 'Email', subject: 'Your booking is confirmed', body: 'Dear customer, your booking {{booking_number}} is confirmed.', createdAt: daysAgo(100) },
      { id: uid('ntm'), type: 'Insurance Expiry', name: 'Insurance Expiry', channel: 'Popup', subject: 'Insurance expiring', body: 'Vehicle {{vehicle}} insurance expires on {{date}}.', createdAt: daysAgo(100) },
    ],
    auditLogs: [
      { id: uid('al'), user: 'admin@rentflow', action: 'CREATE', entity: 'Booking', entityId: bk1, timestamp: daysAgo(5) },
      { id: uid('al'), user: 'admin@rentflow', action: 'UPDATE', entity: 'Booking', entityId: bk1, timestamp: daysAgo(2), after: 'status=Active' },
      { id: uid('al'), user: 'admin@rentflow', action: 'CREATE', entity: 'Payment', entityId: 'PAY-0001', timestamp: daysAgo(2) },
    ],
    users: [
      { id: uid('us'), name: 'Admin', email: 'admin@rentflow', role: 'Super Admin', active: true, lastLogin: hoursAgo(1), createdAt: daysAgo(400), permissions: fullPermissions() },
      { id: uid('us'), name: 'Accountant', email: 'acc@rentflow', role: 'Accountant', active: true, createdAt: daysAgo(200), permissions: emptyPermissions() },
    ],
    settings: {
      businessName: 'RentFlow Rent-A-Car',
      address: 'Colombo 03, Sri Lanka',
      taxRegNumber: 'TAX-123-456-789',
      defaultCurrency: 'LKR',
      taxRate: 0,
      invoicePrefix: 'INV-', invoiceSeq: 3,
      receiptPrefix: 'RCP-', receiptSeq: 1,
      bookingPrefix: 'BK-', bookingSeq: 5,
      paymentPrefix: 'PAY-', paymentSeq: 5,
      expensePrefix: 'EXP-', expenseSeq: 5,
      settlementPrefix: 'STL-', settlementSeq: 3,
      language: 'en',
      calendarColors: {
        Available: '#16a34a', Booked: '#2563eb', Reserved: '#9333ea',
        Pickup: '#ea580c', Return: '#0d9488', Overdue: '#dc2626',
        Maintenance: '#ca8a04', Cancelled: '#6b7280',
      },
      reminderDefaults: {
        'Insurance Expiry': ['30d', '15d', '7d', '1d'],
        'Booking Pickup': ['24h', '3h'],
        'Lease Due': ['7d', '1d', '0d'],
      },
      googleCalendarEmail: undefined,
      googleCalendarSync: false,
    },
  };
}
