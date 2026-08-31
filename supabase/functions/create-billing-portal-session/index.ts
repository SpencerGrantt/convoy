import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17?target=deno'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

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
      return new Response(JSON.stringify({ error: 'Invalid session, please sign out and back in' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const body = await req.json()
    const returnToOrigin = typeof body.return_to_origin === 'string' ? body.return_to_origin : null
    if (!returnToOrigin) {
      return new Response(JSON.stringify({ error: 'return_to_origin is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { data: caller } = await admin
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()
    if (!caller?.company_id || caller.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only the company owner can manage billing' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { data: company, error: companyErr } = await admin
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', caller.company_id)
      .single()
    if (companyErr) throw new Error(companyErr.message)

    if (!company.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Start a subscription first' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${returnToOrigin}/settings?tab=billing`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
