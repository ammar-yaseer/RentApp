// overdue-alerts/index.ts
// Scheduled edge function: scans for overdue/due-soon items and inserts
// notification rows (channel='Popup'). The frontend Realtime subscription
// picks these up and shows toasts + bell badge.
//
// Deploy: supabase functions deploy overdue-alerts --no-verify-jwt
// Schedule: Supabase Dashboard → Edge Functions → overdue-alerts → Schedules
//           Set to run every 15 minutes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const now = new Date();
const todayKey = now.toISOString().slice(0, 10);

function daysFromNow(iso: string): number {
  return (new Date(iso).getTime() - now.getTime()) / 86400000;
}

async function insertNotification(
  type: string, subject: string, message: string, entityId?: string,
): Promise<void> {
  // Dedupe: check if a notification of this type for this entity already exists today
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("type", type)
    .eq("subject", subject)
    .gte("created_at", todayKey)
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("notifications").insert({
    id: crypto.randomUUID(),
    type,
    channel: "Popup",
    subject,
    message,
    scheduled_at: now.toISOString(),
    status: "Sent",
    sent_at: now.toISOString(),
    read: false,
    created_at: now.toISOString(),
  });
}

Deno.serve(async (_req) => {
  try {
    // 1. Overdue bookings (return date passed, still Active)
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id, number, return_at, status, pickup_at")
      .in("status", ["Active", "Due Return", "Overdue"]);

    if (activeBookings) {
      for (const b of activeBookings) {
        const daysOverdue = daysFromNow(b.return_at);
        if (b.status === "Active" && daysOverdue < 0) {
          await insertNotification(
            "Overdue Rental",
            `Overdue: Booking ${b.number}`,
            `Vehicle should have been returned. Booking ${b.number} is overdue.`,
            b.id,
          );
        }
        // Due return today
        const isToday = new Date(b.return_at).toDateString() === now.toDateString();
        if (isToday && (b.status === "Active" || b.status === "Due Return")) {
          await insertNotification(
            "Due Return Today",
            `Due Return Today: ${b.number}`,
            `Vehicle return due today for booking ${b.number}.`,
            b.id,
          );
        }
        // Pickup today
        const pickupToday = new Date(b.pickup_at).toDateString() === now.toDateString();
        if (pickupToday && (b.status === "Confirmed" || b.status === "Reserved")) {
          await insertNotification(
            "Pickup Today",
            `Pickup Today: ${b.number}`,
            `Scheduled pickup today for booking ${b.number}.`,
            b.id,
          );
        }
      }
    }

    // 2. Insurance expiring within 7 days
    const { data: insurances } = await supabase
      .from("insurances")
      .select("id, policy_number, expiry_date, status, vehicle_id")
      .eq("status", "Active");

    if (insurances) {
      for (const ins of insurances) {
        const days = daysFromNow(ins.expiry_date);
        if (days <= 7 && days >= 0) {
          await insertNotification(
            "Insurance Expiry",
            "Insurance Expiring Soon",
            `Policy ${ins.policy_number ?? "—"} expires in ${Math.ceil(days)} day(s).`,
            ins.id,
          );
        }
      }
    }

    // 3. Lease payments due within 3 days
    const { data: leasePayments } = await supabase
      .from("lease_payments")
      .select("id, amount, due_date, status, lease_id")
      .neq("status", "Paid");

    if (leasePayments) {
      for (const p of leasePayments) {
        const days = daysFromNow(p.due_date);
        if (days <= 3) {
          await insertNotification(
            "Lease Due",
            days < 0 ? "Lease Payment Overdue" : "Lease Payment Due",
            `Payment of ${Number(p.amount).toLocaleString()} due ${new Date(p.due_date).toLocaleDateString()}.`,
            p.id,
          );
        }
      }
    }

    // 4. Maintenance due within 3 days
    const { data: maintenances } = await supabase
      .from("maintenances")
      .select("id, next_service_date, vehicle_id");

    if (maintenances) {
      for (const m of maintenances) {
        if (!m.next_service_date) continue;
        const days = daysFromNow(m.next_service_date);
        if (days <= 3 && days >= -7) {
          await insertNotification(
            "Maintenance Due",
            "Maintenance Due",
            `Next service scheduled for ${new Date(m.next_service_date).toLocaleDateString()}.`,
            m.id,
          );
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, checked_at: now.toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
