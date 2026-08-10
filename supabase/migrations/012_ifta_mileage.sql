-- IFTA (International Fuel Tax Agreement) mileage tracking.
--
-- Scope: this table records raw miles-driven-per-jurisdiction, logged by
-- drivers, so owners can pull a quarterly per-jurisdiction mileage total.
-- It deliberately stores nothing about tax rates or tax owed — actual IFTA
-- filing math is the business's accountant/IFTA software's job, same as
-- today. `jurisdiction` is a free two-letter US state/province code the
-- driver picks from a fixed list in the UI, not derived/geocoded from
-- pickup/dropoff coordinates (this schema has no route data to do that
-- accurately, and guessing at a compliance-relevant figure is worse than
-- not guessing).
create table mileage_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  vehicle_id  uuid references vehicles(id),
  driver_id   uuid references profiles(id),
  run_id      uuid references runs(id) on delete set null,  -- optional link, a driver may log mileage without tying it to one specific run
  jurisdiction text not null,  -- two-letter US state/province code the driver enters, e.g. 'CA', 'NV'
  miles       numeric not null check (miles >= 0),
  entry_date  date not null default current_date,
  created_at  timestamptz default now()
);

alter table mileage_entries enable row level security;

-- A driver logs their own mileage; owners/dispatchers read the aggregated
-- report but don't log on a driver's behalf — mirrors the
-- "driver_insert_own_inspection" / "read_own_or_admin_inspection" shape in
-- 007_vehicle_inspections.sql (own-row insert, company-wide management read).
create policy "mileage_select" on mileage_entries
  for select using (
    company_id = my_company_id()
    and (
      driver_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
    )
  );

create policy "mileage_insert" on mileage_entries
  for insert with check (
    company_id = my_company_id()
    and driver_id = auth.uid()
  );

-- No update/delete policy — a logged mileage entry is a record used for a
-- compliance report and shouldn't be silently rewritable after the fact
-- (same reasoning as messages/vehicle_inspections). RLS blocks all
-- updates/deletes by default when no policy grants them, so no trigger is
-- needed here the way 011_messages.sql needed one for its read_at carve-out.

-- Indexes
create index on mileage_entries (company_id, entry_date);
create index on mileage_entries (company_id, jurisdiction, entry_date);
