-- Seed data for Convoy — run in Supabase SQL Editor
-- Creates a company, 3 profiles (owner + 2 drivers), 1 vehicle, 1 contract, and 4 runs

-- 1. Company
insert into companies (id, name, cage_code, uei, naics_codes, sdvosb, sam_expiry)
values (
  '00000000-0000-0000-0000-000000000001',
  'Convoy Medical Transport',
  '8ABC1',
  'JNPBNWODKHQY',
  array['492110','621610'],
  true,
  (current_date + interval '45 days')::date
);

-- 2. Profiles (no auth.users rows yet — these get created on first login)
--    We insert placeholder profiles so foreign keys work in seed data.
--    Replace the UUIDs below with real auth.users IDs after first login.

-- Owner profile (placeholder)
insert into profiles (id, company_id, full_name, phone, role)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Spencer Grant',
  '+15550000001',
  'owner'
) on conflict (id) do nothing;

-- Driver 1
insert into profiles (id, company_id, full_name, phone, role)
values (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Marcus Johnson',
  '+15550000002',
  'driver'
) on conflict (id) do nothing;

-- Driver 2
insert into profiles (id, company_id, full_name, phone, role)
values (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Priya Patel',
  '+15550000003',
  'driver'
) on conflict (id) do nothing;

-- 3. Vehicle
insert into vehicles (id, company_id, name, plate, year, make, model)
values (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'Van 01',
  'CMT-1001',
  2022,
  'Ford',
  'Transit'
);

-- 4. Contract
insert into contracts (id, company_id, name, agency, contract_number, naics_code, annual_value, start_date, end_date, status)
values (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000001',
  'VA Lab Courier Services',
  'Department of Veterans Affairs',
  'VA-2024-CMT-001',
  '492110',
  180000.00,
  current_date - interval '6 months',
  current_date + interval '6 months',
  'active'
);

-- 5. Runs
insert into runs (company_id, driver_id, vehicle_id, contract_id, pickup_address, dropoff_address, status, scheduled_at, picked_up_at, delivered_at, cargo_description, temp_sensitive)
values
  -- Delivered run
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000030',
    '3900 Reservoir Rd NW, Washington DC 20007',
    '50 Irving St NW, Washington DC 20422',
    'delivered',
    now() - interval '5 hours',
    now() - interval '4 hours',
    now() - interval '2 hours',
    'Lab specimens — blood draw panel',
    false
  ),
  -- In transit run
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000030',
    '2300 Eye St NW, Washington DC 20037',
    '1800 G St NW, Washington DC 20006',
    'in_transit',
    now() - interval '1 hour',
    now() - interval '30 minutes',
    null,
    'Pathology slides — temp sensitive',
    true
  ),
  -- Pending run
  (
    '00000000-0000-0000-0000-000000000001',
    null,
    null,
    '00000000-0000-0000-0000-000000000030',
    '110 Irving St NW, Washington DC 20010',
    '3800 Reservoir Rd NW, Washington DC 20007',
    'pending',
    now() + interval '2 hours',
    null,
    null,
    'Pharmacy supplies',
    false
  ),
  -- Assigned run
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000030',
    '4000 Reservoir Rd NW, Washington DC 20007',
    '1 Veterans Dr, Washington DC 20422',
    'assigned',
    now() + interval '4 hours',
    null,
    null,
    'Lab specimens — urine culture',
    false
  );

-- 6. Revenue entry for the delivered run
insert into revenue_entries (company_id, contract_id, amount, description, entry_date)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000030',
  485.00,
  'Lab specimen courier — VA contract',
  current_date
);

-- 7. Expense entries
insert into expense_entries (company_id, category, amount, description, entry_date)
values
  ('00000000-0000-0000-0000-000000000001', 'fuel',       62.40, 'Gas — Van 01',          current_date),
  ('00000000-0000-0000-0000-000000000001', 'driver_pay', 180.00, 'Marcus daily pay',      current_date),
  ('00000000-0000-0000-0000-000000000001', 'driver_pay', 180.00, 'Priya daily pay',       current_date),
  ('00000000-0000-0000-0000-000000000001', 'tolls',       12.50, 'DC bridge tolls',       current_date);

-- 8. Compliance docs for drivers
insert into compliance_docs (company_id, owner_id, doc_type, expiry_date)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'cdl',              current_date + interval '8 months'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'hipaa_cert',       current_date + interval '45 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'background_check', current_date + interval '11 months'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'cdl',              current_date + interval '14 months'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'hipaa_cert',       current_date + interval '25 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'background_check', current_date + interval '6 months');
