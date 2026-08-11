-- SAM.gov opportunities carry a place of performance (city/state); persist
-- it when a contract is saved so it's visible without going back to SAM.gov.
-- No RLS change needed — a plain column on the already company-scoped
-- "company_isolation" policy on contracts.
alter table contracts
  add column if not exists location text;
