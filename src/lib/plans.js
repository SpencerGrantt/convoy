// Single source of truth for plan names, pricing, and feature copy —
// consumed by the marketing Pricing section, Onboarding's Plan step, and
// Settings' Billing tab, so a price change only ever needs updating here.
export const PLAN_META = {
  standard: {
    label: 'Standard',
    monthlyPrice: 79,
    yearlyPrice: 790,
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
    monthlyPrice: 149,
    yearlyPrice: 1490,
    features: [
      'Everything in Standard',
      'SAM.gov contract matching',
      'Federal contract tracking and renewal alerts',
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
