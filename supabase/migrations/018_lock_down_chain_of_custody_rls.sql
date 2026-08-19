-- The original blanket "company_isolation" policies (001_initial_schema.sql)
-- grant ALL commands to any company member with no role or ownership check
-- at all — the same class of gap already found and fixed for vehicles
-- (014_fleet_management.sql) and revenue_entries/expense_entries
-- (015_finances_rls.sql). It was never fixed on the tables below, which
-- includes the actual chain-of-custody system (runs, photos,
-- custody_events, signatures) — a medical courier's compliance backbone.
--
-- Confirmed exploitable 2026-08-19 while auditing the driver role: an
-- unassigned driver account could open any run in the company by URL and
-- successfully call "Mark as delivered" on it, silently corrupting a real
-- in-transit run's status. Postgres OR's multiple PERMISSIVE policies for
-- the same command together, so the existing "driver_run_update" policy
-- (correctly scoped to driver_id = auth.uid() or owner/dispatcher) was
-- already present but completely neutered by "company_isolation" granting
-- UPDATE to the whole company regardless.
--
-- runs: driver_run_update already has the right UPDATE logic — just drop
-- company_isolation so it stops being overridden, and add explicit
-- select/insert/delete. useRuns.js's own comment already assumed RLS was
-- doing this: "Apply explicit filters when profile is available (RLS is
-- the primary guard)" — it wasn't; this makes it actually true. Run
-- creation/deletion follows NewRunForm's intended dispatcher/owner tier
-- (App.jsx's route restriction for /runs/new is added separately).
drop policy if exists "company_isolation" on runs;

create policy "runs_select" on runs
  for select using (
    company_id = my_company_id()
    and (
      driver_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
    )
  );

create policy "runs_insert" on runs
  for insert with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  );

create policy "runs_delete" on runs
  for delete using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  );

-- photos / signatures / custody_events: all three carry run_id + company_id
-- and exist only in the context of one run's chain of custody. A driver
-- should only see/add evidence for their own assigned run; owner/dispatcher
-- keep full company-wide access for dispatch oversight and CoC PDF export
-- (RunDetailPage.jsx's "Download Chain of Custody PDF").
drop policy if exists "company_isolation" on photos;

create policy "photos_select" on photos
  for select using (
    company_id = my_company_id()
    and (
      exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
      or exists (select 1 from runs r where r.id = photos.run_id and r.driver_id = auth.uid())
    )
  );

create policy "photos_insert" on photos
  for insert with check (
    company_id = my_company_id()
    and (
      exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
      or exists (select 1 from runs r where r.id = photos.run_id and r.driver_id = auth.uid())
    )
  );

drop policy if exists "company_isolation" on signatures;

create policy "signatures_select" on signatures
  for select using (
    company_id = my_company_id()
    and (
      exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
      or exists (select 1 from runs r where r.id = signatures.run_id and r.driver_id = auth.uid())
    )
  );

create policy "signatures_insert" on signatures
  for insert with check (
    company_id = my_company_id()
    and (
      exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
      or exists (select 1 from runs r where r.id = signatures.run_id and r.driver_id = auth.uid())
    )
  );

drop policy if exists "company_isolation" on custody_events;

create policy "custody_events_select" on custody_events
  for select using (
    company_id = my_company_id()
    and (
      exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
      or exists (select 1 from runs r where r.id = custody_events.run_id and r.driver_id = auth.uid())
    )
  );

create policy "custody_events_insert" on custody_events
  for insert with check (
    company_id = my_company_id()
    and (
      exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
      or exists (select 1 from runs r where r.id = custody_events.run_id and r.driver_id = auth.uid())
    )
  );

-- No update/delete policy on any of the three above: chain-of-custody
-- evidence should be append-only for every role, including owner. Nothing
-- in the app currently updates or deletes these rows.

-- compliance_docs: MyCompliance.jsx already reads this filtered to
-- owner_id = profile.id client-side for a driver's own docs; Drivers.jsx's
-- "+ Doc" management UI is owner/dispatcher-only. RLS now matches: everyone
-- can read their own record (background-check/HIPAA-cert status is
-- personal), owner/dispatcher can read and manage every record company-wide.
drop policy if exists "company_isolation" on compliance_docs;

create policy "compliance_docs_select" on compliance_docs
  for select using (
    company_id = my_company_id()
    and (
      owner_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
    )
  );

create policy "compliance_docs_manage" on compliance_docs
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  );

-- contracts: Contracts.jsx's own route is already gated
-- roles={['owner','dispatcher']} — RLS now backs that up instead of
-- leaving it a client-only restriction. NewRunForm.jsx's contract dropdown
-- read moves to the owner/dispatcher-only tier along with run creation
-- (App.jsx route restriction added separately), so no driver read path
-- is lost.
drop policy if exists "company_isolation" on contracts;

create policy "contracts_manage" on contracts
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  );

-- invoices: same owner-only tier as revenue_entries/expense_entries
-- (015_finances_rls.sql) and Finances.jsx's route (roles: ['owner']) —
-- these are generated from and shown alongside that same data.
drop policy if exists "company_isolation" on invoices;

create policy "invoices_manage" on invoices
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- sync_queue: dead code — no client code reads or writes this table today
-- (the actual offline queue is IndexedDB-only, see lib/offline.js). Locked
-- down anyway for defense-in-depth/consistency rather than left as the one
-- remaining blanket policy.
drop policy if exists "company_isolation" on sync_queue;

create policy "sync_queue_select" on sync_queue
  for select using (company_id = my_company_id());

create policy "sync_queue_manage" on sync_queue
  for all using (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  )
  with check (
    company_id = my_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
  );
