import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17?target=deno'

// Unlike every other function here, this one is called directly by
// Stripe's servers, not by the Convoy frontend — there's no Supabase
// session, so there's no Authorization header to check. Trust is
// established entirely by verifying the Stripe-Signature header below.
// Deploy with `supabase functions deploy stripe-webhook --no-verify-jwt`
// or every real request from Stripe gets rejected with a 401 before this
// code ever runs.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_ID_STANDARD_MONTHLY') ?? '']: 'standard',
  [Deno.env.get('STRIPE_PRICE_ID_STANDARD_YEARLY') ?? '']: 'standard',
  [Deno.env.get('STRIPE_PRICE_ID_GOVERNMENT_MONTHLY') ?? '']: 'government',
  [Deno.env.get('STRIPE_PRICE_ID_GOVERNMENT_YEARLY') ?? '']: 'government',
}

function mapStatus(stripeStatus: string): string {
  if (stripeStatus === 'trialing') return 'trialing'
  if (stripeStatus === 'active') return 'active'
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due'
  return 'canceled'
}

serve(async (req) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Must read the raw body, never req.json() — constructEvent verifies the
  // signature against the exact bytes Stripe sent, and re-serializing
  // parsed JSON produces a different string that always fails verification.
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err: any) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = subscription.items.data[0]?.price.id
      const plan = PRICE_TO_PLAN[priceId] ?? 'standard'

      const { error } = await admin
        .from('companies')
        .update({
          stripe_subscription_id: subscription.id,
          plan,
          subscription_status: mapStatus(subscription.status),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', session.customer as string)
      if (error) console.error('checkout.session.completed update failed:', error.message)
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const priceId = subscription.items.data[0]?.price.id
      const plan = PRICE_TO_PLAN[priceId] ?? 'standard'

      // Looked up by stripe_customer_id, not metadata — a portal-driven
      // plan change or card update doesn't guarantee metadata set at
      // checkout-session creation still carries over.
      const { error } = await admin
        .from('companies')
        .update({
          plan,
          subscription_status: mapStatus(subscription.status),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', subscription.customer as string)
      if (error) console.error('customer.subscription.updated update failed:', error.message)
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      // Only the standing changes — no other company data is touched or
      // deleted on cancellation.
      const { error } = await admin
        .from('companies')
        .update({ subscription_status: 'canceled' })
        .eq('stripe_customer_id', subscription.customer as string)
      if (error) console.error('customer.subscription.deleted update failed:', error.message)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    // A real processing failure (not "company not found", which is logged
    // above but still returns 200) — let Stripe retry.
    console.error('stripe-webhook processing error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
