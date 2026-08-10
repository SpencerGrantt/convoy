-- Percentage of a run's logged revenue a driver is paid. Set by an owner
-- (see manage-team's update_pay_percent action); read by the driver on
-- their own earnings view.
alter table profiles
  add column if not exists pay_percent numeric check (pay_percent >= 0 and pay_percent <= 100);
