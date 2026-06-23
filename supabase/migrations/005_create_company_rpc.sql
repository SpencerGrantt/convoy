-- RPC to create a company and link it to the calling user's profile in one shot.
-- SECURITY DEFINER bypasses RLS so the RETURNING clause works before
-- the profile.company_id is updated.
create or replace function create_company_for_user(
  p_name        text,
  p_cage_code   text,
  p_uei         text,
  p_naics_codes text[],
  p_sam_expiry  date,
  p_sdvosb      boolean
)
returns json
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
  v_company    json;
begin
  insert into companies (name, cage_code, uei, naics_codes, sam_expiry, sdvosb)
  values (p_name, p_cage_code, p_uei, p_naics_codes, p_sam_expiry, p_sdvosb)
  returning id into v_company_id;

  update profiles set company_id = v_company_id where id = auth.uid();

  select row_to_json(c) into v_company
  from companies c where c.id = v_company_id;

  return v_company;
end;
$$;

grant execute on function create_company_for_user(text, text, text, text[], date, boolean) to authenticated;
