// Single source of truth for plan names, pricing, and feature copy —
// consumed by the marketing Pricing section, Onboarding's Plan step, and
// Settings' Billing tab, so a price change only ever needs updating here.
export const PLAN_META = {
  standard: {
    label: 'Standard',
    monthlyPrice: 49,
    yearlyPrice: 490,
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
    // Pricing.jsx-only fit descriptor, shown above the feature list. Plain
    // "who this is for" framing on purpose - no ROI math, no "worth it"
    // claim, nothing that reads as justifying the price. Kept out of
    // `features` since Settings.jsx joins that array into one sentence; a
    // line like this would read oddly stitched in.
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
