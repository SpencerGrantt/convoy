-- The existing "edit_own_profile" RLS policy (001_initial_schema.sql) only
-- restricts which ROW a user can update (id = auth.uid()) — it does not
-- restrict which COLUMNS they can change, because Postgres RLS operates at
-- row granularity, not column granularity. That means any authenticated
-- user could today call `profiles.update({ role: 'owner' })` against their
-- own row directly and grant themselves ownership, bypassing every
-- role-based restriction built elsewhere in the app (manage-team,
-- upsert-company, route-level role gates, etc.) — those all assume `role`,
-- `company_id`, `onboarding_complete`, and now `pay_percent` can only
-- change through code that has already checked permissions.
--
-- Service-role callers (the upsert-company / manage-team edge functions)
-- are the only legitimate path to changing these fields and must remain
-- unaffected — they connect as the `service_role` Postgres role, which
-- this trigger explicitly exempts.
create or replace function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.company_id is distinct from old.company_id
     or new.onboarding_complete is distinct from old.onboarding_complete
     or new.pay_percent is distinct from old.pay_percent
  then
    raise exception 'Not permitted to change this field directly';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_escalation on profiles;
create trigger profiles_prevent_escalation
  before update on profiles
  for each row execute function prevent_profile_privilege_escalation();
