import { supabase } from './supabase'

// Thin wrapper around supabase.auth.mfa — phone/SMS only (see App.jsx's
// AuthGate for how the resulting "aal2 required" state gates routing).

export async function enrollPhoneFactor(phone) {
  return supabase.auth.mfa.enroll({ factorType: 'phone', phone, friendlyName: 'Phone' })
}

// Enrollment's first SMS is sent automatically by enroll() above — this
// verifies the code the user typed back, which both confirms the code and
// activates the factor in one call.
export async function verifyEnrollment(factorId, code) {
  return supabase.auth.mfa.challengeAndVerify({ factorId, code })
}

export async function listFactors() {
  return supabase.auth.mfa.listFactors()
}

export async function unenrollFactor(factorId) {
  return supabase.auth.mfa.unenroll({ factorId })
}

export async function getAssuranceLevel() {
  return supabase.auth.mfa.getAuthenticatorAssuranceLevel()
}

// Login step-up: challenge sends a fresh SMS to the already-enrolled
// factor, verify checks the code the user types back against it.
export async function challengeFactor(factorId) {
  return supabase.auth.mfa.challenge({ factorId })
}

export async function verifyChallenge(factorId, challengeId, code) {
  return supabase.auth.mfa.verify({ factorId, challengeId, code })
}
