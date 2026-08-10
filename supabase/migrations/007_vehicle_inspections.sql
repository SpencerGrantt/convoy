-- Pre/post-trip vehicle inspection checklists, submitted by drivers.
create table vehicle_inspections (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references companies(id) on delete cascade,
  driver_id        uuid references profiles(id),
  vehicle_id       uuid references vehicles(id),
  run_id           uuid references runs(id) on delete set null,
  inspection_type  text check (inspection_type in ('pre_trip','post_trip')) not null,
  checklist        jsonb not null default '{}'::jsonb,
  notes            text,
  photo_path       text,
  created_at       timestamptz default now()
);

alter table vehicle_inspections enable row level security;

-- A driver may only file an inspection under their own company and their
-- own driver_id — mirrors the "driver acts as themselves" shape used by
-- driver_run_update below, rather than the blanket company_isolation policy
-- used on tables where every company member can write any row.
create policy "driver_insert_own_inspection" on vehicle_inspections
  for insert with check (
    company_id = my_company_id()
    and driver_id = auth.uid()
  );

-- Drivers read their own inspections; owners/dispatchers read the whole
-- company's inspection history for fleet compliance oversight.
create policy "read_own_or_admin_inspection" on vehicle_inspections
  for select using (
    company_id = my_company_id()
    and (
      driver_id = auth.uid()
      or exists (
        select 1 from profiles
        where id = auth.uid() and role in ('owner','dispatcher')
      )
    )
  );

-- Indexes, matching the pattern in 001_initial_schema.sql
create index on vehicle_inspections (company_id, created_at desc);
create index on vehicle_inspections (driver_id);
create index on vehicle_inspections (vehicle_id);

-- Storage bucket for optional inspection photos, matching 003_storage.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-inspections', 'vehicle-inspections', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "auth_upload_vehicle_inspections" on storage.objects
  for insert with check (bucket_id = 'vehicle-inspections' and auth.uid() is not null);

create policy "auth_read_vehicle_inspections" on storage.objects
  for select using (bucket_id = 'vehicle-inspections' and auth.uid() is not null);
