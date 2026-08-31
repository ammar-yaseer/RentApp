// google-calendar-sync/index.ts
// Bi-directional Google Calendar sync for bookings, lease payments,
// maintenance, and insurance expiry events.
//
// Two endpoints:
//   GET  /auth    — starts OAuth flow (redirect to Google consent)
//   GET  /callback — handles OAuth callback (stores refresh token)
//   POST /sync    — syncs DB changes to Google Calendar
//   GET  /sync    — polls Google Calendar for external changes
//
// Deploy: supabase functions deploy google-calendar-sync --no-verify-jwt
//
// Env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-sync/callback`;

async function exchangeCode(code: string): Promise<any> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  return await res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<any> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  return await res.json();
}

async function createCalendarEvent(accessToken: string, calendarId: string, event: any): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
  const data = await res.json();
  return data.id ?? null;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/google-calendar-sync", "");

  try {
    // === OAuth start ===
    if (path === "/auth" || path.endsWith("/auth")) {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
      });
      return Response.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
        302,
      );
    }

    // === OAuth callback ===
    if (path === "/callback" || path.endsWith("/callback")) {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokens = await exchangeCode(code);
      if (tokens.error) {
        return new Response(`OAuth error: ${tokens.error_description ?? tokens.error}`, { status: 400 });
      }

      // Get the user's primary calendar ID
      const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList/primary", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const calData = await calRes.json();
      const calendarId = calData.id ?? "primary";

      // Store tokens
      await supabase.from("google_tokens").upsert({
        id: 1,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        calendar_id: calendarId,
        updated_at: new Date().toISOString(),
      });

      // Update settings to enable sync
      await supabase.from("settings").update({
        google_calendar_sync: true,
        google_calendar_email: calData.id,
      }).eq("id", 1);

      return new Response(
        `<html><body><h2>Google Calendar connected!</h2><p>You can close this tab.</p><script>window.close()</script></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    }

    // === Sync ===
    if (path === "/sync" || path.endsWith("/sync") || path === "") {
      // Get stored tokens
      const { data: tokenRow } = await supabase
        .from("google_tokens")
        .select("*")
        .eq("id", 1)
        .single();

      if (!tokenRow || !tokenRow.refresh_token) {
        return new Response(JSON.stringify({ error: "Google Calendar not connected. Visit /auth first." }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }

      // Refresh access token
      const tokens = await refreshAccessToken(tokenRow.refresh_token);
      if (tokens.error) {
        return new Response(JSON.stringify({ error: `Token refresh failed: ${tokens.error}` }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }

      // Update stored access token
      await supabase.from("google_tokens").update({
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", 1);

      const accessToken = tokens.access_token;
      const calendarId = tokenRow.calendar_id ?? "primary";
      let synced = 0;

      // Sync bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, number, pickup_at, return_at, rental_type, status")
        .in("status", ["Confirmed", "Active", "Due Return", "Overdue", "Reserved"]);

      if (bookings) {
        for (const b of bookings) {
          const event = {
            summary: `${b.rental_type} — ${b.number}`,
            description: `Booking: ${b.number}\nStatus: ${b.status}`,
            start: { dateTime: b.pickup_at, timeZone: "UTC" },
            end: { dateTime: b.return_at, timeZone: "UTC" },
          };
          await createCalendarEvent(accessToken, calendarId, event);
          synced++;
        }
      }

      // Sync lease payments due
      const { data: leasePayments } = await supabase
        .from("lease_payments")
        .select("id, due_date, amount, status, lease_id")
        .neq("status", "Paid")
        .gte("due_date", new Date().toISOString());

      if (leasePayments) {
        for (const p of leasePayments) {
          const end = new Date(p.due_date);
          end.setHours(end.getHours() + 1);
          const event = {
            summary: `Lease Payment Due`,
            description: `Amount: ${Number(p.amount).toLocaleString()}`,
            start: { dateTime: p.due_date, timeZone: "UTC" },
            end: { dateTime: end.toISOString(), timeZone: "UTC" },
          };
          await createCalendarEvent(accessToken, calendarId, event);
          synced++;
        }
      }

      // Sync insurance expiries
      const { data: insurances } = await supabase
        .from("insurances")
        .select("id, expiry_date, policy_number, provider, vehicle_id")
        .eq("status", "Active")
        .gte("expiry_date", new Date().toISOString());

      if (insurances) {
        for (const ins of insurances) {
          const end = new Date(ins.expiry_date);
          end.setHours(end.getHours() + 1);
          const event = {
            summary: `Insurance Expiry — ${ins.policy_number ?? "—"}`,
            description: `Provider: ${ins.provider ?? "—"}`,
            start: { dateTime: ins.expiry_date, timeZone: "UTC" },
            end: { dateTime: end.toISOString(), timeZone: "UTC" },
          };
          await createCalendarEvent(accessToken, calendarId, event);
          synced++;
        }
      }

      // Sync maintenance
      const { data: maintenances } = await supabase
        .from("maintenances")
        .select("id, service_date, type, work_performed, next_service_date")
        .gte("service_date", new Date(Date.now() - 7 * 86400000).toISOString());

      if (maintenances) {
        for (const m of maintenances) {
          const end = new Date(m.service_date);
          end.setHours(end.getHours() + 2);
          const event = {
            summary: `Maintenance — ${m.type}`,
            description: `Work: ${m.work_performed ?? "—"}`,
            start: { dateTime: m.service_date, timeZone: "UTC" },
            end: { dateTime: end.toISOString(), timeZone: "UTC" },
          };
          await createCalendarEvent(accessToken, calendarId, event);
          synced++;
        }
      }

      return new Response(JSON.stringify({ ok: true, synced }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found. Use /auth, /callback, or /sync", { status: 404 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
