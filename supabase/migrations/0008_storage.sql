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

-- Public read for vehicle-photos and system-assets
create policy "public_read_vehicle_photos" on storage.objects for select
  to public using (bucket_id = 'vehicle-photos');
create policy "public_read_system_assets" on storage.objects for select
  to public using (bucket_id = 'system-assets');

-- Authenticated write for vehicle-photos
create policy "authed_write_vehicle_photos" on storage.objects for insert
  to authenticated with check (bucket_id = 'vehicle-photos');
create policy "authed_update_vehicle_photos" on storage.objects for update
  to authenticated using (bucket_id = 'vehicle-photos');
create policy "authed_delete_vehicle_photos" on storage.objects for delete
  to authenticated using (bucket_id = 'vehicle-photos');

-- Authenticated write for system-assets
create policy "authed_write_system_assets" on storage.objects for insert
  to authenticated with check (bucket_id = 'system-assets');
create policy "authed_update_system_assets" on storage.objects for update
  to authenticated using (bucket_id = 'system-assets');
create policy "authed_delete_system_assets" on storage.objects for delete
  to authenticated using (bucket_id = 'system-assets');

-- Authenticated read/write for booking-documents
create policy "authed_read_booking_documents" on storage.objects for select
  to authenticated using (bucket_id = 'booking-documents');
create policy "authed_write_booking_documents" on storage.objects for insert
  to authenticated with check (bucket_id = 'booking-documents');
create policy "authed_update_booking_documents" on storage.objects for update
  to authenticated using (bucket_id = 'booking-documents');
create policy "authed_delete_booking_documents" on storage.objects for delete
  to authenticated using (bucket_id = 'booking-documents');

-- Authenticated read/write for inspection-photos
create policy "authed_read_inspection_photos" on storage.objects for select
  to authenticated using (bucket_id = 'inspection-photos');
create policy "authed_write_inspection_photos" on storage.objects for insert
  to authenticated with check (bucket_id = 'inspection-photos');
create policy "authed_update_inspection_photos" on storage.objects for update
  to authenticated using (bucket_id = 'inspection-photos');
create policy "authed_delete_inspection_photos" on storage.objects for delete
  to authenticated using (bucket_id = 'inspection-photos');

-- Authenticated read/write for signatures
create policy "authed_read_signatures" on storage.objects for select
  to authenticated using (bucket_id = 'signatures');
create policy "authed_write_signatures" on storage.objects for insert
  to authenticated with check (bucket_id = 'signatures');
create policy "authed_update_signatures" on storage.objects for update
  to authenticated using (bucket_id = 'signatures');
create policy "authed_delete_signatures" on storage.objects for delete
  to authenticated using (bucket_id = 'signatures');

-- Authenticated read/write for documents-pdf
create policy "authed_read_documents_pdf" on storage.objects for select
  to authenticated using (bucket_id = 'documents-pdf');
create policy "authed_write_documents_pdf" on storage.objects for insert
  to authenticated with check (bucket_id = 'documents-pdf');
create policy "authed_update_documents_pdf" on storage.objects for update
  to authenticated using (bucket_id = 'documents-pdf');
create policy "authed_delete_documents_pdf" on storage.objects for delete
  to authenticated using (bucket_id = 'documents-pdf');
