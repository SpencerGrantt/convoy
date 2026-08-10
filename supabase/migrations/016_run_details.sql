-- Load-level details requested for daily/commercial runs (not every run is
-- tied to a SAM contract — a broker-booked spot-market haul needs its own
-- customer/BOL/rate record). No RLS changes needed: these are plain columns
-- on tables that already have company-scoped policies covering insert/update
-- (runs' "company_isolation", revenue_entries' "revenue_manage" from
-- 015_finances_rls.sql).
alter table runs
  add column if not exists broker_name    text,   -- customer/broker this run was booked through, when not on a contract
  add column if not exists bol_number     text,   -- Bill of Lading number
  add column if not exists rate_per_mile  numeric(8,2),
  add column if not exists loaded_miles   numeric,
  add column if not exists deadhead_miles numeric;  -- empty miles (to pickup, or back from dropoff with no load)

alter table revenue_entries
  add column if not exists payment_method text check (payment_method in (
    'cash','check','ach','credit_card','other'
  ));
