import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: { user }, error: authErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session — please sign out and back in' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const body = await req.json()

    let companyId = body.company_id ?? null

    // Validate a plan change (used by Onboarding's Plan step to record the
    // free-trial plan choice) before any company writes happen, same as any
    // other request-body-derived value that ends up in a company row.
    const planChange: string | null =
      body.plan === 'standard' || body.plan === 'government' ? body.plan : null
    if (body.plan !== undefined && planChange === null) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // Drivers can update their own profile fields (name/phone/address) through
    // this same function, but must never be able to edit company info — that's
    // limited to owner/dispatcher ("management"). A brand-new self-signup
    // admin has no profile row yet at this point (that's expected — they're
    // creating their company for the first time), so only block when a
    // profile already exists and its role is 'driver'. A plan change is
    // company info too — this same block must run even when skip_company is
    // true, or a driver could smuggle a plan change past it.
    if (!body.skip_company || planChange) {
      const { data: caller } = await admin
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single()
      if (caller && caller.role === 'driver') {
        return new Response(JSON.stringify({ error: 'Only an owner or dispatcher can edit company info' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }
      // This runs as the service role (bypasses RLS), so unlike a normal
      // client update it never gets my_company_id()'s scoping for free —
      // without this check, any owner/dispatcher could pass an arbitrary
      // company_id in the request body and this function would happily
      // overwrite a completely different company's CAGE code, UEI, SDVOSB
      // status, etc. `companyId` must match the caller's own company_id
      // exactly (an existing profile always has one at this point — the
      // no-profile-yet case is the brand-new self-signup admin creating
      // their first company, which is why caller can be null/companyless
      // here rather than rejected outright).
      if (companyId && caller?.company_id && companyId !== caller.company_id) {
        return new Response(JSON.stringify({ error: 'Not authorized to edit this company' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }
      if (companyId && caller && !caller.company_id) {
        return new Response(JSON.stringify({ error: 'Not authorized to edit this company' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }
    }

    // skip_company: true → only update the profile (used by team-member onboarding path)
    if (!body.skip_company) {
      const companyFields = {
        name: body.name || 'My Company',
        cage_code: body.cage_code || null,
        uei: body.uei || null,
        naics_codes: body.naics_codes ?? [],
        sam_expiry: body.sam_expiry || null,
        sdvosb: body.sdvosb ?? false,
      }

      if (companyId) {
        const { error: updateErr } = await admin
          .from('companies')
          .update(companyFields)
          .eq('id', companyId)
        if (updateErr) throw new Error(updateErr.message)
      } else {
        const { data: newCompany, error: insertErr } = await admin
          .from('companies')
          .insert(companyFields)
          .select()
          .single()
        if (insertErr) throw new Error(insertErr.message)
        companyId = newCompany.id
      }
    }

    // Applied independently of skip_company (the Onboarding Plan step calls
    // this with skip_company: true) — this runs as the service role, so it's
    // the one client-reachable path the companies_prevent_billing_tampering
    // trigger (021_billing_stripe.sql) allows to set `plan`.
    if (planChange && companyId) {
      const { error: planErr } = await admin
        .from('companies')
        .update({ plan: planChange })
        .eq('id', companyId)
      if (planErr) throw new Error(planErr.message)
    }

    const profileUpdate: Record<string, unknown> = {}
    if (body.full_name !== undefined) profileUpdate.full_name = body.full_name
    if (body.phone !== undefined) profileUpdate.phone = body.phone
    if (body.address !== undefined) profileUpdate.address = body.address
    if (!body.company_id) profileUpdate.company_id = companyId
    if (body.onboarding_complete === true) profileUpdate.onboarding_complete = true

    if (Object.keys(profileUpdate).length > 0) {
      const { data: updatedRows, error: profileErr } = await admin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)
        .select('id')
      if (profileErr) throw new Error(profileErr.message)

      // No existing row to update — this account's profile was never
      // provisioned (e.g. client-side auto-creation on first login failed
      // silently). Create it now instead of erroring, so onboarding is
      // always able to self-heal a broken account rather than dead-ending.
      //
      // Critical: an invited driver/dispatcher who hits this path must NOT
      // silently become an 'owner' with no company. Their real role and
      // company were fixed at invite time in the auth user's metadata (see
      // Settings.jsx/Sidebar.jsx's signInWithOtp calls) — recover those
      // here rather than defaulting, or the self-heal "fix" actively
      // corrupts an invited account into an unrelated admin profile.
      if (!updatedRows || updatedRows.length === 0) {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>
        const inviteRole = typeof meta.role === 'string' ? meta.role : 'owner'
        const inviteCompanyId = typeof meta.company_id === 'string' ? meta.company_id : undefined

        const { error: insertErr } = await admin.from('profiles').insert({
          id: user.id,
          company_id: (profileUpdate.company_id as string | undefined) ?? companyId ?? inviteCompanyId ?? null,
          full_name: (profileUpdate.full_name as string | undefined) ?? '',
          phone: (profileUpdate.phone as string | undefined) ?? null,
          address: (profileUpdate.address as string | undefined) ?? null,
          role: inviteRole,
          onboarding_complete: (profileUpdate.onboarding_complete as boolean | undefined) ?? false,
        })
        if (insertErr) throw new Error(insertErr.message)
      }
    }

    const { data: profile, error: fetchErr } = await admin
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single()
    if (fetchErr) throw new Error(fetchErr.message)

    return new Response(JSON.stringify({ profile }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
