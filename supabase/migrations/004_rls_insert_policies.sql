-- Allow authenticated users to create a company on first login
create policy "insert_company" on companies
  for insert with check (auth.uid() is not null);

-- Allow users to update their own company
create policy "update_own_company" on companies
  for update using (id = my_company_id());

-- Allow users to insert their own profile row
create policy "insert_own_profile" on profiles
  for insert with check (id = auth.uid());
