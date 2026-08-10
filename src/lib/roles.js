// Single source of truth for how each account role is shown to a human.
// The underlying `role` value stays 'owner'/'dispatcher'/'driver' in the
// database, RLS policies, and every edge function — this is a display-only
// relabeling (drivers are called "Crew" in the UI) to avoid hierarchical-
// sounding language, not a data model change. Renaming the stored value
// would mean touching the CHECK constraint, every RLS policy, and every
// `role === 'driver'` comparison across the codebase for zero functional
// gain over just changing what gets rendered.
export const ROLE_LABELS = {
  owner: 'Head Admin',
  dispatcher: 'Dispatcher',
  driver: 'Crew',
}

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role
}
