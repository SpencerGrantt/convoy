-- Extend vehicles with fleet-management fields.
alter table vehicles
  add column if not exists vehicle_type text,
  add column if not exists registration_number text,
  add column if not exists registration_expiry date,
  add column if not exists current_odometer numeric;

-- The original "company_isolation" policy on vehicles (001_initial_schema.sql)
-- grants ALL commands (select/insert/update/delete) to any company member
-- with no role check at all — meaning a driver could today call
-- vehicles.update() directly via the API despite having no UI path to do
-- so. Fleet data (registration, maintenance costs) is operational/financial
-- data that should be owner/dispatcher-managed, same tier as this app's
-- Drivers/Contracts pages. Replace the blanket policy with role-split ones:
-- read stays company-wide (every driver-facing page's vehicle dropdown —
-- VehicleInspection.jsx, NewRunForm.jsx, MileageLog.jsx, IftaReport.jsx —
-- depends on this staying readable by everyone), writes become
-- owner/dispatcher only. Postgres RLS policies for the same command are
-- OR'd together, so vehicles_select (company-wide) and vehicles_manage's
-- USING clause both apply to SELECT and the broader one wins — SELECT stays
-- company-wide even though vehicles_manage also mentions it.
drop policy if exists "company_isolation" on vehicles;

create policy "vehicles_select" on vehicles
  for select using (company_id = my_company_id());

create policy "vehicles_manage" on vehicles
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  );

-- Maintenance history per vehicle.
create table maintenance_logs (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid references companies(id) on delete cascade,
  vehicle_id           uuid references vehicles(id) on delete cascade,
  service_type         text not null,
  description          text,
  cost                 numeric,
  odometer_at_service  numeric,
  performed_at         date not null default current_date,
  next_due_date        date,
  next_due_miles       numeric,
  created_at           timestamptz default now()
);

alter table maintenance_logs enable row level security;

create policy "maintenance_select" on maintenance_logs
  for select using (company_id = my_company_id());

create policy "maintenance_manage" on maintenance_logs
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  );

create index on maintenance_logs (company_id, vehicle_id, performed_at desc);
create index on maintenance_logs (next_due_date);
