-- The original "company_isolation" policies on revenue_entries and
-- expense_entries (001_initial_schema.sql) grant ALL commands to any
-- company member with no role check — same class of gap already found and
-- fixed for vehicles (014_fleet_management.sql). Finances is an owner-only
-- surface in this app (Finances.jsx's route is gated roles: ['owner'], not
-- owner+dispatcher like Fleet/Drivers), so writes become owner-only here
-- too, matching that existing route restriction exactly rather than
-- introducing a new tier.
--
-- Reads must stay company-wide: MyEarnings.jsx reads revenue_entries (via
-- runs) to compute a driver's own pay, so a driver needs SELECT access to
-- compute their own earnings even though they can't see or edit the
-- Finances page itself.
drop policy if exists "company_isolation" on revenue_entries;
drop policy if exists "company_isolation" on expense_entries;

create policy "revenue_select" on revenue_entries
  for select using (company_id = my_company_id());

create policy "revenue_manage" on revenue_entries
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "expense_select" on expense_entries
  for select using (company_id = my_company_id());

create policy "expense_manage" on expense_entries
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );
