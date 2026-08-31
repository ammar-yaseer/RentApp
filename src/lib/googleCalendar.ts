// NOTE: When migrating to Supabase, replace this URL-based approach with
// Google Calendar API + OAuth. Store the OAuth refresh token in Supabase.
// Use a Supabase Edge Function to sync events bi-directionally.
import type { Booking, LeasePayment, Maintenance, Insurance } from '../types';

/**
 * Google Calendar integration utilities.
 * Since this is frontend-only, we use Google Calendar's URL scheme to create events
 * and generate .ics files for download/import.
 *
 * When the backend is connected, this can be replaced with OAuth + Calendar API
 * for true two-way sync.
 */

interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  startISO: string;
  endISO: string;
}

/** Convert a Booking to a calendar event */
export function bookingToEvent(booking: Booking, vehicleLabel: string, customerLabel: string): CalendarEvent {
  return {
    title: `${booking.rentalType} — ${booking.number} — ${vehicleLabel}`,
    description: `Booking: ${booking.number}\nType: ${booking.rentalType}\nCustomer: ${customerLabel}\nVehicle: ${vehicleLabel}\nDaily Rate: ${booking.dailyRate}\nDeposit: ${booking.deposit}\nStatus: ${booking.status}${booking.notes ? `\nNotes: ${booking.notes}` : ''}`,
    location: booking.pickupLocation,
    startISO: booking.pickupAt,
    endISO: booking.returnAt,
  };
}

/** Convert a lease payment to a calendar event */
export function leasePaymentToEvent(payment: LeasePayment, leaseNumber: string): CalendarEvent {
  const end = new Date(payment.dueDate);
  end.setHours(end.getHours() + 1);
  return {
    title: `Lease Payment Due — ${leaseNumber}`,
    description: `Lease: ${leaseNumber}\nAmount: ${payment.amount}\nStatus: ${payment.status}`,
    startISO: payment.dueDate,
    endISO: end.toISOString(),
  };
}

/** Convert maintenance to a calendar event */
export function maintenanceToEvent(maint: Maintenance, vehicleLabel: string): CalendarEvent {
  const end = new Date(maint.serviceDate);
  end.setHours(end.getHours() + 2);
  return {
    title: `Maintenance — ${vehicleLabel} — ${maint.type}`,
    description: `Vehicle: ${vehicleLabel}\nType: ${maint.type}\nWork: ${maint.workPerformed ?? '—'}\nNext service: ${maint.nextServiceDate ?? '—'}`,
    startISO: maint.serviceDate,
    endISO: end.toISOString(),
  };
}

/** Convert insurance expiry to a calendar event */
export function insuranceToEvent(ins: Insurance, vehicleLabel: string): CalendarEvent {
  const end = new Date(ins.expiryDate);
  end.setHours(end.getHours() + 1);
  return {
    title: `Insurance Expiry — ${vehicleLabel}`,
    description: `Vehicle: ${vehicleLabel}\nPolicy: ${ins.policyNumber ?? '—'}\nProvider: ${ins.provider ?? '—'}\nPremium: ${ins.premium}`,
    startISO: ins.expiryDate,
    endISO: end.toISOString(),
  };
}

/**
 * Generate a Google Calendar "add event" URL.
 * Opens Google Calendar in the browser with pre-filled event details.
 * If a Google account email is configured, the user should be logged in to that account.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = formatGoogleDate(event.startISO);
  const end = formatGoogleDate(event.endISO);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
  });
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Format date for Google Calendar URL: YYYYMMDDTHHMMSSZ (UTC) */
function formatGoogleDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear().toString();
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const min = d.getUTCMinutes().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}00Z`;
}

/**
 * Generate an ICS calendar file content for a single event.
 * This can be downloaded and imported into Google Calendar, Outlook, Apple Calendar, etc.
 */
export function eventToICS(event: CalendarEvent): string {
  const start = formatICSDate(event.startISO);
  const end = formatICSDate(event.endISO);
  const uid = `${Date.now()}@rentflow`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentFlow//Rental Management//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    event.location ? `LOCATION:${escapeICS(event.location)}` : '',
    `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

/**
 * Generate an ICS file with multiple events (for bulk export).
 */
export function eventsToICS(events: CalendarEvent[]): string {
  const now = formatICSDate(new Date().toISOString());
  const vevents = events.map((event) => {
    const start = formatICSDate(event.startISO);
    const end = formatICSDate(event.endISO);
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@rentflow`;
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description)}`,
      event.location ? `LOCATION:${escapeICS(event.location)}` : '',
      `DTSTAMP:${now}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  }).join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentFlow//Rental Management//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

function formatICSDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear().toString();
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const min = d.getUTCMinutes().toString().padStart(2, '0');
  const ss = d.getUTCSeconds().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Google Calendar sync URL — opens Google Calendar with the user's account.
 * The email parameter ensures the correct account is used if multiple are logged in.
 */
export function googleCalendarAuthUrl(email?: string): string {
  if (email) {
    return `https://calendar.google.com/calendar/u/${encodeURIComponent(email)}/r`;
  }
  return 'https://calendar.google.com/calendar/r';
}
