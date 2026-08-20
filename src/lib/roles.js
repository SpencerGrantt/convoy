// Single source of truth for how each account role is shown to a human.
// The underlying `role` value stays 'owner'/'dispatcher'/'driver' in the
// database, RLS policies, and every edge function — this is a display-only
// relabeling, not a data model change. Renaming the stored value would mean
// touching the CHECK constraint, every RLS policy, and every
// `role === 'driver'` comparison across the codebase for zero functional
// gain over just changing what gets rendered.
export const ROLE_LABELS = {
  owner: 'Admin',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
}

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role
}
