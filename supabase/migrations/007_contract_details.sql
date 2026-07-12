-- Richer SAM.gov opportunity details on saved contracts, plus a state
-- column so contracts can be filtered by place of performance.
alter table contracts
  add column if not exists solicitation_number text,
  add column if not exists notice_type         text,
  add column if not exists department          text,
  add column if not exists subtier             text,
  add column if not exists office              text,
  add column if not exists offers_due_at       timestamptz,
  add column if not exists published_at        date,
  add column if not exists state               text;
