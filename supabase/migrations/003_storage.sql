-- Create private storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('run-photos', 'run-photos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('signatures', 'signatures', false, 2097152,  array['image/png']),
  ('receipts',   'receipts',   false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('invoices',   'invoices',   false, 10485760, array['application/pdf']),
  ('compliance', 'compliance', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

-- Storage policies — authenticated users in the same company can read/write
create policy "auth_upload_photos" on storage.objects
  for insert with check (bucket_id = 'run-photos' and auth.uid() is not null);

create policy "auth_read_photos" on storage.objects
  for select using (bucket_id = 'run-photos' and auth.uid() is not null);

create policy "auth_upload_signatures" on storage.objects
  for insert with check (bucket_id = 'signatures' and auth.uid() is not null);

create policy "auth_read_signatures" on storage.objects
  for select using (bucket_id = 'signatures' and auth.uid() is not null);

create policy "auth_upload_receipts" on storage.objects
  for insert with check (bucket_id = 'receipts' and auth.uid() is not null);

create policy "auth_read_receipts" on storage.objects
  for select using (bucket_id = 'receipts' and auth.uid() is not null);

create policy "auth_manage_invoices" on storage.objects
  for all using (bucket_id = 'invoices' and auth.uid() is not null);

create policy "auth_manage_compliance" on storage.objects
  for all using (bucket_id = 'compliance' and auth.uid() is not null);
