create table demo_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  message    text,
  created_at timestamptz not null default now()
);

alter table demo_requests enable row level security;

-- Public marketing form submits anonymously (no auth) — the first
-- anon-writable table in the schema; every other insert policy (see
-- 004_rls_insert_policies.sql) requires auth.uid() is not null.
-- Intentionally write-only: no select/update/delete policy is granted to
-- anon or authenticated, so submissions are readable only via the
-- Supabase dashboard or a service-role query. This is the intended access
-- model, not an oversight.
create policy "demo_requests_insert" on demo_requests
  for insert to anon, authenticated
  with check (true);
