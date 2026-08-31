-- 0005_rls.sql
-- Row Level Security policies.
-- Single-tenant: all authenticated users can CRUD all business data.
-- Module-level view/create/edit/delete gating is enforced in the frontend
-- via profiles.permissions (see src/lib/permissions.ts).

-- Helper: check if current user is an admin role
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('Super Admin', 'Owner')
  );
$$;

-- Enable RLS on all business tables
alter table branches enable row level security;
alter table vehicles enable row level security;
alter table vehicle_documents enable row level security;
alter table customers enable row level security;
alter table drivers enable row level security;
alter table bookings enable row level security;
alter table inspections enable row level security;
alter table payments enable row level security;
alter table deposits enable row level security;
alter table documents enable row level security;
alter table expenses enable row level security;
alter table vendors enable row level security;
alter table lease_contracts enable row level security;
alter table lease_payments enable row level security;
alter table insurances enable row level security;
alter table insurance_claims enable row level security;
alter table maintenances enable row level security;
alter table investors enable row level security;
alter table investor_transactions enable row level security;
alter table profit_allocations enable row level security;
alter table reserve_accounts enable row level security;
alter table reserve_transactions enable row level security;
alter table settlements enable row level security;
alter table bank_accounts enable row level security;
alter table bank_transactions enable row level security;
alter table notifications enable row level security;
alter table notification_templates enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;
alter table google_tokens enable row level security;
alter table profiles enable row level security;

-- Generic policy: authenticated users can read/write all business data
-- (applied to all tables except profiles, settings, google_tokens, audit_logs)
do $$
declare t text;
begin
  for t in select unnest(array[
    'branches','vehicles','vehicle_documents','customers','drivers',
    'bookings','inspections','payments','deposits','documents','expenses',
    'vendors','lease_contracts','lease_payments','insurances','insurance_claims',
    'maintenances','investors','investor_transactions','profit_allocations',
    'reserve_accounts','reserve_transactions','settlements',
    'bank_accounts','bank_transactions','notifications','notification_templates'
  ]) loop
    execute format('drop policy if exists %I on %I;', 'rls_select', t);
    execute format('drop policy if exists %I on %I;', 'rls_insert', t);
    execute format('drop policy if exists %I on %I;', 'rls_update', t);
    execute format('drop policy if exists %I on %I;', 'rls_delete', t);
    execute format('create policy rls_select on %I for select to authenticated using (true);', t);
    execute format('create policy rls_insert on %I for insert to authenticated with check (true);', t);
    execute format('create policy rls_update on %I for update to authenticated using (true) with check (true);', t);
    execute format('create policy rls_delete on %I for delete to authenticated using (true);', t);
  end loop;
end $$;

-- Profiles: users can read/update their own row; admins can read/update all
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid() or public.is_admin());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Settings: authenticated can read; only admins can write
drop policy if exists settings_select on settings;
drop policy if exists settings_update on settings;
create policy settings_select on settings for select to authenticated using (true);
create policy settings_update on settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Google tokens: only the owning user + admins
drop policy if exists gt_select on google_tokens;
drop policy if exists gt_update on google_tokens;
create policy gt_select on google_tokens for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy gt_update on google_tokens for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Audit logs: authenticated can read; client INSERT is blocked (trigger writes via security definer)
drop policy if exists audit_select on audit_logs;
drop policy if exists audit_insert on audit_logs;
create policy audit_select on audit_logs for select to authenticated using (true);
create policy audit_insert on audit_logs for insert to authenticated with check (false);
