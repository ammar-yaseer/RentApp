# RentFlow — Supabase Backend Setup Guide

This guide walks you through setting up the Supabase backend for RentFlow.
You will run the SQL migrations, configure environment variables, deploy edge
functions, and create your initial admin user.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose a name (e.g. `rentflow`), set a strong database password, and pick a region close to your users.
4. Wait for the project to provision (~2 minutes).

---

## 2. Run SQL Migrations

Go to **SQL Editor** in the Supabase dashboard and run each file in order.
Copy-paste the contents of each file from `supabase/migrations/`:

| Order | File | What it does |
|-------|------|-------------|
| 1 | `0001_extensions.sql` | Enables required Postgres extensions |
| 2 | `0002_enums.sql` | Creates all enum types |
| 3 | `0003_tables.sql` | Creates all business tables + indexes |
| 4 | `0004_profiles.sql` | Auth trigger + admin RPCs (create user, reset password, toggle active) |
| 5 | `0005_rls.sql` | Enables Row Level Security on all tables |
| 6 | `0006_audit_triggers.sql` | Auto-audit triggers on all tables |
| 7 | `0007_sequences_rpc.sql` | Atomic document number generator |
| 8 | `0008_storage.sql` | Creates Storage buckets + policies |
| 9 | `0009_seed.sql` | Seeds sample data + sets admin permissions |
| 10 | `0010_cron.sql` | (Optional) Schedules edge functions via pg_cron |

**Run them one at a time in order.** Each file is idempotent (safe to re-run).

> **Note on 0008_storage.sql:** If `storage.f_policy_create` is not available
> on your Supabase version, use the alternative `CREATE POLICY` syntax at the
> bottom of that file (uncomment it).

---

## 3. Create the Admin Auth User

**Before running `0009_seed.sql`**, create the admin user:

1. Go to **Authentication → Users → Add user**.
2. Email: `admin@rentflow` (or any email you want).
3. Password: choose a strong password.
4. Click **Create user**.
5. **Now run `0009_seed.sql`** — it will update the admin's profile to
   `Super Admin` with full permissions.

> If you used a different email, edit the `WHERE email = 'admin@rentflow'`
> line in `0009_seed.sql` before running it.

---

## 4. Configure Frontend Environment Variables

Create a file named `.env.local` in the project root (`rentflow/`):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key
```

Find these values in:
- **Project Settings → API → Project URL**
- **Project Settings → API → anon public** key

> The anon key is safe to expose in the frontend — RLS protects your data.

---

## 5. Configure Auth Settings

In the Supabase dashboard:

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:5173` (dev) or your production URL.
3. Add **Redirect URLs**:
   - `http://localhost:5173`
   - Your production URL (if deploying)
4. Under **Authentication → Providers → Email**:
   - Make sure **Enable Email provider** is ON.
   - For production, consider disabling **Confirm email** for easier onboarding,
     or keep it enabled and confirm users manually.

---

## 6. Deploy Edge Functions

Install the Supabase CLI (if not already):
```bash
npm install -g supabase
```

Login and link your project:
```bash
supabase login
supabase link --project-ref your-project-ref
```

Deploy the four edge functions:
```bash
supabase functions deploy overdue-alerts --no-verify-jwt
supabase functions deploy notification-sender --no-verify-jwt
supabase functions deploy google-calendar-sync --no-verify-jwt
supabase functions deploy report-pdf --no-verify-jwt
```

> `--no-verify-jwt` is used for scheduled functions (cron calls them with
> the service role key, not a user JWT). For `report-pdf`, you can deploy
> without that flag if you want user JWT verification.

---

## 7. Configure Edge Function Secrets

Go to **Project Settings → Edge Functions → Secrets** (or use the CLI):

```bash
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find the service role key in **Project Settings → API → service_role**.
**Keep this secret — never expose it in the frontend.**

### Google Calendar (optional — only if you want calendar sync)

```bash
supabase secrets set GOOGLE_CLIENT_ID=your-google-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-google-client-secret
```

See section 9 below for Google Cloud setup.

### NOT needed this phase (skipped):
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` — SMS/WhatsApp
- `RESEND_API_KEY` — Email

These are stubbed in `notification-sender` and will activate automatically
if you add them later.

---

## 8. Schedule the Overdue Alerts Function

### Option A: Supabase Dashboard (recommended)
1. Go to **Edge Functions → overdue-alerts → Schedules**.
2. Click **Add Schedule**.
3. Set cron expression: `*/15 * * * *` (every 15 minutes).
4. (Optional) Schedule `notification-sender` every 5 minutes: `*/5 * * * *`.

### Option B: pg_cron (if available)
Edit `0010_cron.sql`, replace `<your-project>` and `<service-role-key>`,
then run it in the SQL Editor.

---

## 9. Google Calendar Setup (Optional)

Only needed if you want bi-directional calendar sync.

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project.
3. Enable **Google Calendar API**:
   - APIs & Services → Library → search "Google Calendar API" → Enable.
4. Configure OAuth consent screen:
   - APIs & Services → OAuth consent screen → External.
   - Fill in app name, support email, developer email.
   - Add scope: `https://www.googleapis.com/auth/calendar`.
   - Add your email as a test user.
5. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID.
   - Application type: **Web application**.
   - Authorized redirect URI:
     `https://your-project-ref.supabase.co/functions/v1/google-calendar-sync/callback`
6. Copy the **Client ID** and **Client Secret**.
7. Set them as Supabase secrets (see section 7).
8. To connect your calendar, visit:
   `https://your-project-ref.supabase.co/functions/v1/google-calendar-sync/auth`
   in your browser. After granting access, sync is enabled.
9. To trigger a manual sync, POST to:
   `https://your-project-ref.supabase.co/functions/v1/google-calendar-sync/sync`

---

## 10. Storage Buckets

The `0008_storage.sql` migration creates these buckets:

| Bucket | Public | Used for |
|--------|--------|----------|
| `vehicle-photos` | Yes | Vehicle main photos |
| `system-assets` | Yes | Business logo |
| `booking-documents` | No | Customer documents (NIC, license, etc.) |
| `inspection-photos` | No | Odometer + damage photos |
| `signatures` | No | Customer/staff signatures |
| `documents-pdf` | No | Generated PDFs (invoices, receipts) |

If the SQL didn't create them (some Supabase versions differ), create them
manually via **Storage → New bucket**.

---

## 11. Run the App

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. You should see the login page.
Sign in with the admin email/password you created in step 3.

---

## 12. Creating New Users

1. Sign in as admin.
2. Go to **Settings → User Accounts → Add User**.
3. Fill in name, email, role, and initial password.
4. **New users start with empty permissions** — no module access by default.
5. Check the modules/actions you want to grant.
6. Click **Save**.

The user can now sign in with their email/password and will only see
the modules you granted access to.

---

## 13. File Overview

```
supabase/
  migrations/
    0001_extensions.sql
    0002_enums.sql
    0003_tables.sql
    0004_profiles.sql
    0005_rls.sql
    0006_audit_triggers.sql
    0007_sequences_rpc.sql
    0008_storage.sql
    0009_seed.sql
    0010_cron.sql
  functions/
    overdue-alerts/index.ts
    notification-sender/index.ts
    google-calendar-sync/index.ts
    report-pdf/index.ts

src/
  lib/
    supabase.ts          # Supabase client + camelCase transforms
    auth.tsx             # AuthProvider + useAuth hook
    storage.ts           # Storage upload helpers
  modules/
    Login.tsx            # Email/password login page
  data/
    store.tsx            # Supabase-backed store (same API as before)
```

---

## Troubleshooting

**"Missing VITE_SUPABASE_URL" warning**
→ Create `.env.local` with the correct values (section 4).

**Login fails with "Invalid credentials"**
→ Make sure the user exists in Authentication → Users and the password is correct.

**Profile not loading after login**
→ The `handle_new_user` trigger should auto-create a profile. If it didn't,
   run `0004_profiles.sql` again, or manually insert a row into `profiles`.

**RLS blocking all queries**
→ Make sure `0005_rls.sql` ran successfully. Check that policies exist:
   `select * from pg_policies where schemaname = 'public';`

**Storage upload fails**
→ Check that buckets exist (Storage section in dashboard) and policies
   are in place (section 10).

**Realtime not updating**
→ Realtime requires the Supabase project to have Replication enabled.
   Go to Database → Replication → enable for all tables.

**Edge function returns 401**
→ If using `--no-verify-jwt`, make sure you're passing the service role key
   in the `Authorization: Bearer` header when calling from cron/dashboard.
