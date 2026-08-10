-- Address field for the driver onboarding form (name/email/phone/address).
-- phone already existed; address did not.
alter table profiles
  add column if not exists address text;
