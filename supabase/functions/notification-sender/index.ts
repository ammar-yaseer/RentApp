// notification-sender/index.ts
// Processes pending notifications. This phase: only handles Popup channel
// (marks as Sent — the frontend Realtime subscription handles delivery).
// Structured for future email/SMS/WhatsApp providers — just set env vars
// and the routing code will pick them up.
//
// Deploy: supabase functions deploy notification-sender --no-verify-jwt
// Schedule: every 5 minutes via Supabase Dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Email provider (Resend) — not active this phase. Set RESEND_API_KEY to enable.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// SMS/WhatsApp provider (Twilio) — not active this phase. Set TWILIO_* to enable.
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM = Deno.env.get("TWILIO_FROM");

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentFlow <noreply@rentflow.app>",
        to,
        subject,
        text: body,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) return false;
  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_FROM,
          To: to,
          Body: message,
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (_req) => {
  try {
    // Fetch pending notifications whose scheduled time has passed
    const { data: pending, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("status", "Pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(100);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    for (const n of pending) {
      let success = true;
      let failureReason: string | null = null;

      switch (n.channel) {
        case "Popup":
          // Popup notifications are delivered via Realtime on the frontend.
          // Just mark as Sent.
          break;
        case "Email":
          if (n.recipient) {
            success = await sendEmail(n.recipient, n.subject, n.message);
            if (!success && !RESEND_API_KEY) {
              failureReason = "Email provider not configured (RESEND_API_KEY not set)";
            }
          } else {
            failureReason = "No recipient email";
            success = false;
          }
          break;
        case "SMS":
        case "WhatsApp":
          if (n.recipient) {
            success = await sendSMS(n.recipient, n.message);
            if (!success && !TWILIO_ACCOUNT_SID) {
              failureReason = "SMS provider not configured (TWILIO_* not set)";
            }
          } else {
            failureReason = "No recipient phone";
            success = false;
          }
          break;
        case "Push":
          // Web Push not implemented this phase
          failureReason = "Push notifications not yet implemented";
          success = false;
          break;
      }

      // Update notification status
      await supabase
        .from("notifications")
        .update({
          status: success ? "Sent" : "Failed",
          sent_at: success ? new Date().toISOString() : null,
          failure_reason: failureReason,
        })
        .eq("id", n.id);

      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
