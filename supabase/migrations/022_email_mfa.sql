-- Per-account opt-in for email-code 2FA (see src/pages/VerifyMfa.jsx and
-- Settings' Security tab). Replaces the earlier phone/SMS MFA approach —
-- this uses Supabase's own built-in OTP email sending (the same mechanism
-- behind "sign in with magic link"), so it needs no third-party SMS
-- provider and no per-message cost. A user's own security preference, same
-- self-service threat model as changing their own password — no special
-- RLS beyond the existing "edit_own_profile" policy is needed.
alter table profiles
  add column if not exists mfa_email_enabled boolean not null default false;
