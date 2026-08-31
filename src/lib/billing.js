// Live as of 2026-08-31: real Stripe price IDs are wired in and the two
// known companies (AT Logisitcs, 29 Integrity Logistics) are pinned to
// subscription_status 'active' so this doesn't retroactively paywall them.
// Flipping back to false re-disables trial-expiry/plan gating in App.jsx,
// Sidebar.jsx, and MobileNav.jsx, the Billing tab in Settings.jsx, and the
// Plan step in Onboarding.jsx, with no other code changes needed.
export const BILLING_ENABLED = true
