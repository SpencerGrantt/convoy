// Stripe billing (schema, edge functions, gating) is fully built but held
// dormant until there are real customers and live Stripe keys — flipping
// this back to true re-enables trial-expiry/plan gating in App.jsx,
// Sidebar.jsx, and MobileNav.jsx, the Billing tab in Settings.jsx, and the
// Plan step in Onboarding.jsx, with no other code changes needed.
export const BILLING_ENABLED = false
