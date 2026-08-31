// Single source of truth for plan names, pricing, and feature copy —
// consumed by the marketing Pricing section, Onboarding's Plan step, and
// Settings' Billing tab, so a price change only ever needs updating here.
// `bestFor` is a Pricing.jsx-only fit descriptor shown under the plan
// name. Plain "who this is for" framing on purpose - no ROI math, no
// "worth it" claim, nothing that reads as justifying the price. Kept out
// of `features` since Settings.jsx joins that array into one sentence; a
// line like this would read oddly stitched in.
// monthlyPaymentLink/yearlyPaymentLink are Stripe Payment Links — static
// checkout URLs, used only by the marketing Pricing section's purchase
// buttons for a visitor with no account yet. Unrelated to the dynamic
// create-checkout-session flow Onboarding/Settings use, which requires an
// already-authenticated company owner.
export const PLAN_META = {
  standard: {
    label: 'Standard',
    monthlyPrice: 49,
    yearlyPrice: 490,
    monthlyPaymentLink: 'https://buy.stripe.com/8x2eVf1tc1mBfFy1u1aR200',
    yearlyPaymentLink: 'https://buy.stripe.com/14AcN7dbUe9n792a0xaR201',
    bestFor: 'Best for fleets focused on day-to-day operations',
    features: [
      'Dispatch and real-time run tracking',
      'Photo-verified chain-of-custody',
      'Driver compliance and vehicle inspections',
      'Finances, mileage, and IFTA reporting',
      'AI assistant',
      'Unlimited drivers, no per-seat fees',
    ],
  },
  government: {
    label: 'Government',
    monthlyPrice: 99,
    yearlyPrice: 990,
    monthlyPaymentLink: 'https://buy.stripe.com/6oUaEZdbU3uJ0KE3C9aR202',
    yearlyPaymentLink: 'https://buy.stripe.com/00w00l4Fofdr1OI3C9aR203',
    bestFor: 'Best for fleets actively bidding on new government contracts',
    features: [
      'Everything in Standard',
      'Get matched to new SAM.gov opportunities automatically',
      'Never miss a bid deadline or registration renewal',
    ],
  },
}

export function planLabel(plan) {
  return PLAN_META[plan]?.label ?? plan
}

export function planPrice(plan, interval) {
  const meta = PLAN_META[plan]
  if (!meta) return null
  return interval === 'yearly' ? meta.yearlyPrice : meta.monthlyPrice
}
