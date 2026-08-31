-- 0008_storage.sql
-- Storage buckets for images and documents.
-- Run this in the Supabase SQL Editor. Storage buckets can also be
-- created via the dashboard (Storage → New bucket).

-- Public buckets (readable without auth)
insert into storage.buckets (id, name, public) values ('vehicle-photos', 'vehicle-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('system-assets', 'system-assets', true)
  on conflict (id) do nothing;

-- Private buckets (require auth or signed URL)
insert into storage.buckets (id, name, public) values ('booking-documents', 'booking-documents', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('inspection-photos', 'inspection-photos', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('signatures', 'signatures', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents-pdf', 'documents-pdf', false)
  on conflict (id) do nothing;

-- Storage policies: authenticated users can upload/read
-- Public buckets: anyone can read
do $$
begin
  -- vehicle-photos (public read, authed write)
  perform storage.f_policy_create('vehicle-photos', 'public_read', 'SELECT', 'authenticated', 'true');
  perform storage.f_policy_create('vehicle-photos', 'authed_write', 'INSERT', 'authenticated', 'true');
  perform storage.f_policy_create('vehicle-photos', 'authed_update', 'UPDATE', 'authenticated', 'true');
  perform storage.f_policy_create('vehicle-photos', 'authed_delete', 'DELETE', 'authenticated', 'true');

  -- system-assets (public read, authed write)
  perform storage.f_policy_create('system-assets', 'public_read', 'SELECT', 'authenticated', 'true');
  perform storage.f_policy_create('system-assets', 'authed_write', 'INSERT', 'authenticated', 'true');
  perform storage.f_policy_create('system-assets', 'authed_update', 'UPDATE', 'authenticated', 'true');
  perform storage.f_policy_create('system-assets', 'authed_delete', 'DELETE', 'authenticated', 'true');

  -- booking-documents (authed read/write)
  perform storage.f_policy_create('booking-documents', 'authed_read', 'SELECT', 'authenticated', 'true');
  perform storage.f_policy_create('booking-documents', 'authed_write', 'INSERT', 'authenticated', 'true');
  perform storage.f_policy_create('booking-documents', 'authed_update', 'UPDATE', 'authenticated', 'true');
  perform storage.f_policy_create('booking-documents', 'authed_delete', 'DELETE', 'authenticated', 'true');

  -- inspection-photos (authed read/write)
  perform storage.f_policy_create('inspection-photos', 'authed_read', 'SELECT', 'authenticated', 'true');
  perform storage.f_policy_create('inspection-photos', 'authed_write', 'INSERT', 'authenticated', 'true');
  perform storage.f_policy_create('inspection-photos', 'authed_update', 'UPDATE', 'authenticated', 'true');
  perform storage.f_policy_create('inspection-photos', 'authed_delete', 'DELETE', 'authenticated', 'true');

  -- signatures (authed read/write)
  perform storage.f_policy_create('signatures', 'authed_read', 'SELECT', 'authenticated', 'true');
  perform storage.f_policy_create('signatures', 'authed_write', 'INSERT', 'authenticated', 'true');
  perform storage.f_policy_create('signatures', 'authed_update', 'UPDATE', 'authenticated', 'true');
  perform storage.f_policy_create('signatures', 'authed_delete', 'DELETE', 'authenticated', 'true');

  -- documents-pdf (authed read/write)
  perform storage.f_policy_create('documents-pdf', 'authed_read', 'SELECT', 'authenticated', 'true');
  perform storage.f_policy_create('documents-pdf', 'authed_write', 'INSERT', 'authenticated', 'true');
  perform storage.f_policy_create('documents-pdf', 'authed_update', 'UPDATE', 'authenticated', 'true');
  perform storage.f_policy_create('documents-pdf', 'authed_delete', 'DELETE', 'authenticated', 'true');
end $$;

-- Note: if storage.f_policy_create is not available on your Supabase version,
-- create policies manually via the dashboard or use this alternative syntax:
-- create policy "authed_read" on storage.objects for select to authenticated
--   using (bucket_id in ('booking-documents','inspection-photos','signatures','documents-pdf'));
-- create policy "authed_write" on storage.objects for insert to authenticated
--   with check (bucket_id in ('booking-documents','inspection-photos','signatures','documents-pdf'));
-- create policy "public_read" on storage.objects for select
--   using (bucket_id in ('vehicle-photos','system-assets'));
