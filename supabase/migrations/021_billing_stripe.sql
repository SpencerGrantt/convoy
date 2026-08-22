alter table companies
  add column plan                    text not null default 'standard'
                                        check (plan in ('standard','government')),
  add column subscription_status     text not null default 'trialing'
                                        check (subscription_status in ('trialing','active','past_due','canceled')),
  add column stripe_customer_id      text unique,
  add column stripe_subscription_id  text unique,
  add column trial_ends_at           timestamptz not null default (now() + interval '14 days'),
  add column current_period_end      timestamptz;

-- insert_company's RLS policy (004_rls_insert_policies.sql) only checks
-- auth.uid() is not null, with no column restriction, so a crafted client
-- insert could otherwise set plan/subscription_status/stripe_* directly.
-- Mirrors the existing profiles_prevent_escalation trigger pattern
-- (010_prevent_profile_privilege_escalation.sql): exempt service_role
-- (the only legitimate writer, via the Stripe edge functions), force
-- tamper-proof defaults on insert, and reject any other update to these
-- fields outright.
create or replace function prevent_company_billing_tampering()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    new.plan                   := 'standard';
    new.subscription_status    := 'trialing';
    new.stripe_customer_id     := null;
    new.stripe_subscription_id := null;
    new.trial_ends_at          := now() + interval '14 days';
    new.current_period_end     := null;
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.current_period_end is distinct from old.current_period_end
  then
    raise exception 'Not permitted to change billing fields directly';
  end if;

  return new;
end;
$$;

drop trigger if exists companies_prevent_billing_tampering on companies;
create trigger companies_prevent_billing_tampering
  before insert or update on companies
  for each row execute function prevent_company_billing_tampering();
