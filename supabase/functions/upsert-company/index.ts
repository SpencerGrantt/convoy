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

    const profileUpdate: Record<string, unknown> = {}
    if (body.full_name !== undefined) profileUpdate.full_name = body.full_name
    if (!body.company_id) profileUpdate.company_id = companyId
    if (body.onboarding_complete === true) profileUpdate.onboarding_complete = true

    if (Object.keys(profileUpdate).length > 0) {
      const { data: updatedRows, error: profileErr } = await admin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)
        .select('id')
      if (profileErr) throw new Error(profileErr.message)
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('No profile record found for this account — please sign out and back in, then try again.')
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
