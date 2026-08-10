-- Driver <-> management messaging.
--
-- Model: one channel per driver, not arbitrary 1:1 DMs. `driver_id` names
-- whose channel a message belongs to; `sender_id` is whoever actually wrote
-- it (the driver themself, or any owner/dispatcher at the company). Any
-- owner/dispatcher can read and post into any driver's channel; a driver
-- only ever sees their own channel. Mirrors the "driver_run_update" policy
-- shape in 001_initial_schema.sql (company-scoped, own-row-or-management).

create table messages (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  driver_id   uuid references profiles(id) on delete cascade,  -- whose channel this belongs to
  sender_id   uuid references profiles(id),                    -- who wrote it (the driver, or any owner/dispatcher)
  body        text not null,
  created_at  timestamptz default now(),
  read_at     timestamptz
);

alter table messages enable row level security;

create policy "channel_participants_select" on messages
  for select using (
    company_id = my_company_id()
    and (
      driver_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
    )
  );

create policy "channel_participants_insert" on messages
  for insert with check (
    company_id = my_company_id()
    and sender_id = auth.uid()
    and (
      driver_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
    )
  );

-- Update is used to mark messages as read (see read_at).
create policy "channel_participants_update_read" on messages
  for update using (
    company_id = my_company_id()
    and (
      driver_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('owner','dispatcher'))
    )
  );

-- The update policy above (needed so a reader can flip read_at) has no
-- WITH CHECK, so RLS alone doesn't stop someone rewriting a message's body,
-- sender, or channel after the fact — RLS restricts which rows, not which
-- columns. For a business communication log that's a real integrity
-- problem (edited-after-the-fact messages undermine the log as a record),
-- so lock every column but read_at behind this trigger, mirroring the same
-- pattern already used on profiles (010_prevent_profile_privilege_escalation.sql).
create or replace function prevent_message_content_edit()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.driver_id is distinct from old.driver_id
     or new.company_id is distinct from old.company_id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Only read_at may be changed on an existing message';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_prevent_content_edit on messages;
create trigger messages_prevent_content_edit
  before update on messages
  for each row execute function prevent_message_content_edit();

-- Indexes
create index on messages (company_id, driver_id, created_at);
create index on messages (driver_id, read_at);

-- 1-year retention: delete messages older than 1 year, daily at 3am.
-- NOTE: this requires the pg_cron extension to be enabled on the Supabase
-- project (available on most paid tiers via the Database > Extensions UI,
-- may not be available on all plans). If `create extension pg_cron` fails
-- when this migration is applied, the rest of the migration (table + RLS +
-- indexes) is unaffected — just run the retention job manually/via a
-- different scheduler (e.g. a Supabase Edge Function on a cron trigger) and
-- flag it for follow-up.
create extension if not exists pg_cron;

select cron.schedule(
  'delete-old-messages',
  '0 3 * * *',
  $$ delete from messages where created_at < now() - interval '1 year' $$
);
