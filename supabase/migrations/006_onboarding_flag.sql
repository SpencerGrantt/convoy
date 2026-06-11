-- Add onboarding_complete flag to profiles
alter table profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Anyone who already has a company linked is considered onboarded
update profiles
  set onboarding_complete = true
  where company_id is not null;
