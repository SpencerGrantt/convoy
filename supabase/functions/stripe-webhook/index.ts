import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17?target=deno'

// Unlike every other function here, this one is called directly by
// Stripe's servers, not by the Vantar frontend — there's no Supabase
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
      const customerId = session.customer as string

      const { data: updated, error } = await admin
        .from('companies')
        .update({
          stripe_subscription_id: subscription.id,
          plan,
          subscription_status: mapStatus(subscription.status),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', customerId)
        .select('id')
      if (error) console.error('checkout.session.completed update failed:', error.message)

      // No existing company matched this Stripe customer — this is a
      // brand-new buyer from a landing-page Payment Link, not an in-app
      // upgrade (create-checkout-session always sets stripe_customer_id on
      // an existing company before checkout even starts, so that path
      // always matches above). Provision their company and invite them —
      // the invite email is their onboarding email; self-serve signup is
      // disabled, so this is the only way a new owner account gets created.
      if (!error && (!updated || updated.length === 0)) {
        const email = session.customer_details?.email
        if (!email) {
          console.error('checkout.session.completed: new customer with no email, cannot invite', customerId)
        } else {
          const { data: newCompany, error: insertErr } = await admin
            .from('companies')
            .insert({
              name: session.customer_details?.name || 'My Company',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              plan,
              subscription_status: mapStatus(subscription.status),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .select('id')
            .single()
          if (insertErr) {
            console.error('checkout.session.completed: failed to create company for new buyer:', insertErr.message)
          } else {
            const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
              data: { company_id: newCompany.id, role: 'owner' },
              redirectTo: 'https://vantar.tech',
            })
            // A pre-existing auth user (e.g. they already had a Vantar
            // login) can't be re-invited — the company/subscription is
            // still correctly recorded above either way, this only means
            // the automatic account-linking step needs a human follow-up.
            // Notify rather than only logging, since a silently-unlinked
            // paying customer is exactly the kind of thing nobody happens
            // to go looking for in function logs.
            if (inviteErr) {
              console.error('checkout.session.completed: invite failed for', email, inviteErr.message)
              const notifyEmail = Deno.env.get('DEMO_NOTIFY_EMAIL')
              const resendKey = Deno.env.get('RESEND_API_KEY')
              if (notifyEmail && resendKey) {
                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    from: 'Vantar <notifications@vantar.tech>',
                    to: [notifyEmail],
                    subject: 'Manual follow-up needed: paid signup could not be auto-linked',
                    text: `${email} just paid for the ${plan} plan (company id ${newCompany.id}), but already has a Vantar account, so they could not be auto-invited to the new company. The payment and new company record are fine, this just needs the account linked by hand.`,
                  }),
                }).catch(() => {})
              }
            }
          }
        }
      }
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
