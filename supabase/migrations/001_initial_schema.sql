create extension if not exists "pgcrypto";

create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cage_code   text,
  uei         text,
  naics_codes text[],
  sdvosb      boolean default false,
  sam_expiry  date,
  created_at  timestamptz default now()
);

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  company_id  uuid references companies(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text check (role in ('owner','dispatcher','driver')) not null,
  avatar_url  text,
  created_at  timestamptz default now()
);

create table vehicles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  name        text not null,
  plate       text,
  vin         text,
  year        int,
  make        text,
  model       text,
  active      boolean default true,
  created_at  timestamptz default now()
);

create table contracts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references companies(id) on delete cascade,
  name            text not null,
  agency          text,
  contract_number text,
  naics_code      text,
  annual_value    numeric(12,2),
  start_date      date,
  end_date        date,
  status          text check (status in ('active','pending','expired','renewal')) default 'active',
  sam_link        text,
  notes           text,
  created_at      timestamptz default now()
);

create table runs (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references companies(id) on delete cascade,
  driver_id        uuid references profiles(id),
  vehicle_id       uuid references vehicles(id),
  contract_id      uuid references contracts(id),
  pickup_address   text not null,
  dropoff_address  text not null,
  pickup_lat       double precision,
  pickup_lng       double precision,
  dropoff_lat      double precision,
  dropoff_lng      double precision,
  status           text check (status in (
                     'pending','assigned','in_transit','delivered','cancelled'
                   )) default 'pending',
  scheduled_at     timestamptz,
  picked_up_at     timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz default now(),
  cargo_description text,
  temp_sensitive    boolean default false,
  temp_log          jsonb,
  anomaly_flag      boolean default false,
  anomaly_note      text,
  notes            text
);

create table photos (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid references runs(id) on delete cascade,
  company_id  uuid references companies(id) on delete cascade,
  driver_id   uuid references profiles(id),
  photo_type  text check (photo_type in (
                'pickup_before','pickup_sealed',
                'delivery_arrived','delivery_signed'
              )) not null,
  storage_path text not null,
  lat         double precision,
  lng         double precision,
  taken_at    timestamptz default now()
);

create table signatures (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid references runs(id) on delete cascade,
  company_id   uuid references companies(id) on delete cascade,
  signer_name  text,
  storage_path text not null,
  signed_at    timestamptz default now()
);

create table custody_events (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid references runs(id) on delete cascade,
  company_id  uuid references companies(id) on delete cascade,
  actor_id    uuid references profiles(id),
  event_type  text not null,
  note        text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz default now()
);

create table revenue_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  run_id      uuid references runs(id),
  contract_id uuid references contracts(id),
  amount      numeric(10,2) not null,
  description text,
  entry_date  date not null default current_date,
  created_at  timestamptz default now()
);

create table expense_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  category    text check (category in (
                'fuel','driver_pay','insurance','maintenance',
                'tolls','supplies','other'
              )) not null,
  amount      numeric(10,2) not null,
  description text,
  entry_date  date not null default current_date,
  receipt_path text,
  created_at  timestamptz default now()
);

create table invoices (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references companies(id) on delete cascade,
  contract_id   uuid references contracts(id),
  invoice_number text,
  period_start  date,
  period_end    date,
  total_amount  numeric(12,2),
  status        text check (status in ('draft','sent','paid','overdue')) default 'draft',
  pdf_path      text,
  sent_at       timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz default now()
);

create table compliance_docs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  owner_id    uuid references profiles(id),
  doc_type    text not null,
  expiry_date date,
  storage_path text,
  notes       text,
  created_at  timestamptz default now()
);

create table sync_queue (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  driver_id   uuid references profiles(id),
  action      text not null,
  payload     jsonb not null,
  synced_at   timestamptz,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table companies        enable row level security;
alter table profiles         enable row level security;
alter table vehicles         enable row level security;
alter table runs             enable row level security;
alter table photos           enable row level security;
alter table signatures       enable row level security;
alter table custody_events   enable row level security;
alter table contracts        enable row level security;
alter table revenue_entries  enable row level security;
alter table expense_entries  enable row level security;
alter table invoices         enable row level security;
alter table compliance_docs  enable row level security;
alter table sync_queue       enable row level security;

-- Company isolation helper
create or replace function my_company_id()
returns uuid language sql security definer stable as $$
  select company_id from profiles where id = auth.uid()
$$;

-- RLS policies
create policy "company_isolation" on runs
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on photos
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on signatures
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on custody_events
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on contracts
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on revenue_entries
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on expense_entries
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on invoices
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on vehicles
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on compliance_docs
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "company_isolation" on sync_queue
  using (company_id = my_company_id())
  with check (company_id = my_company_id());

create policy "read_company_profiles" on profiles
  for select using (company_id = my_company_id());

create policy "edit_own_profile" on profiles
  for update using (id = auth.uid());

create policy "read_own_company" on companies
  for select using (id = my_company_id());

create policy "driver_run_update" on runs
  for update using (
    company_id = my_company_id()
    and (
      driver_id = auth.uid()
      or exists (
        select 1 from profiles
        where id = auth.uid() and role in ('owner','dispatcher')
      )
    )
  );

-- Indexes
create index on runs (company_id, status);
create index on runs (driver_id);
create index on runs (created_at desc);
create index on photos (run_id);
create index on custody_events (run_id, created_at);
create index on revenue_entries (company_id, entry_date);
create index on expense_entries (company_id, entry_date);
create index on compliance_docs (expiry_date);
