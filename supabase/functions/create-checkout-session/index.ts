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

const PRICE_IDS: Record<string, Record<string, string>> = {
  standard: {
    monthly: Deno.env.get('STRIPE_PRICE_ID_STANDARD_MONTHLY')!,
    yearly: Deno.env.get('STRIPE_PRICE_ID_STANDARD_YEARLY')!,
  },
  government: {
    monthly: Deno.env.get('STRIPE_PRICE_ID_GOVERNMENT_MONTHLY')!,
    yearly: Deno.env.get('STRIPE_PRICE_ID_GOVERNMENT_YEARLY')!,
  },
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
      return new Response(JSON.stringify({ error: 'Invalid session, please sign out and back in' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const body = await req.json()
    const plan = body.plan === 'government' ? 'government' : body.plan === 'standard' ? 'standard' : null
    const interval = body.interval === 'yearly' ? 'yearly' : body.interval === 'monthly' ? 'monthly' : null
    const returnToOrigin = typeof body.return_to_origin === 'string' ? body.return_to_origin : null
    // Onboarding's Plan step and Settings' Billing tab both call this
    // function but need to land back in different places after Checkout —
    // an already-onboarded owner going through Settings must not be routed
    // through /onboarding, which would just bounce them straight back out
    // (OnboardingGate redirects anyone with onboarding_complete already true).
    const context = body.context === 'settings' ? 'settings' : 'onboarding'

    if (!plan || !interval || !returnToOrigin) {
      return new Response(JSON.stringify({ error: 'plan, interval, and return_to_origin are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // Billing actions are owner-only — stricter than upsert-company's
    // owner-or-dispatcher bar, since this creates a real payment obligation,
    // not just an edit to company info.
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
      .select('id, stripe_customer_id')
      .eq('id', caller.company_id)
      .single()
    if (companyErr) throw new Error(companyErr.message)

    let customerId = company.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { company_id: company.id },
      })
      customerId = customer.id
      const { error: updateErr } = await admin
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id)
      if (updateErr) throw new Error(updateErr.message)
    }

    const returnPath = context === 'settings' ? '/settings?tab=billing' : '/onboarding'

    const priceId = PRICE_IDS[plan][interval]
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { company_id: company.id } },
      metadata: { company_id: company.id },
      success_url: `${returnToOrigin}${returnPath}${returnPath.includes('?') ? '&' : '?'}checkout=success`,
      cancel_url: `${returnToOrigin}${returnPath}`,
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
