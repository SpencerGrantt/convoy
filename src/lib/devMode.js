// Lets exactly one account preview the app as Admin/Driver/Dispatch without
// signing out — a local-only role override for QA, never a real permission
// change. RLS still enforces the account's real role server-side; this only
// swaps what `profile.role` reads as on the client, so every existing
// role-driven check (Sidebar, MobileNav, AuthGate, Home) picks it up for
// free with no changes of its own.
const DEV_EMAIL = 'spenag20@gmail.com'

export function isDevUser(session) {
  return session?.user?.email?.toLowerCase() === DEV_EMAIL
}

export const VIEW_ROLES = [
  { value: 'owner', label: 'Admin' },
  { value: 'driver', label: 'Driver' },
  { value: 'dispatcher', label: 'Dispatch' },
]

export const VIEW_PLANS = [
  { value: 'standard', label: 'Standard' },
  { value: 'government', label: 'Government' },
]
