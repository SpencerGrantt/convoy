import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase, invokeFn } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import AlertBanner from '../components/ui/AlertBanner'
import { safeFormatDate } from '../lib/dates'
import { roleLabel } from '../lib/roles'
import { PLAN_META, planLabel, planPrice } from '../lib/plans'
import { BILLING_ENABLED } from '../lib/billing'
import { Shield, Users, Calendar, Hash, Building2, ShieldCheck, Smartphone } from 'lucide-react'
import { listFactors, enrollPhoneFactor, verifyEnrollment, unenrollFactor } from '../lib/mfa'

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

// Phone/SMS 2FA — a personal account-security setting, not company data,
// so it's kept self-contained here rather than threading its state through
// the parent form's save flow (which the "Save Changes" button below still
// handles for account/company fields).
function SecurityTab({ profile, setProfileDirect }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'none' | 'enrolled' | 'enrolling-phone' | 'enrolling-code'
  const [factorId, setFactorId] = useState(null)
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await listFactors()
    const factor = data?.phone?.[0]
    if (error) {
      setError(error.message)
      setStatus('none')
      return
    }
    if (factor) {
      setFactorId(factor.id)
      setStatus('enrolled')
    } else {
      setStatus('none')
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function startEnroll() {
    setError('')
    setStatus('enrolling-phone')
  }

  async function sendCode() {
    if (!phone.trim()) return
    setBusy(true); setError('')
    const { data, error } = await enrollPhoneFactor(phone.trim())
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setFactorId(data.id)
    // Saved now (rather than only after verification) so VerifyMfa's
    // "ending in ####" hint has a number to read even if this exact tab
    // session doesn't stick around to see the enrollment through —
    // listFactors() never returns the phone number itself.
    await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', profile.id)
    setProfileDirect({ ...profile, phone: phone.trim() })
    setStatus('enrolling-code')
    setBusy(false)
  }

  async function confirmCode() {
    if (!factorId || code.length < 6) return
    setBusy(true); setError('')
    const { error } = await verifyEnrollment(factorId, code)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setCode('')
    setBusy(false)
    setStatus('enrolled')
  }

  async function remove() {
    if (!factorId) return
    if (!window.confirm('Remove two-factor authentication? Future sign-ins will only require your password.')) return
    setBusy(true); setError('')
    const { error } = await unenrollFactor(factorId)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setFactorId(null)
    setBusy(false)
    setStatus('none')
  }

  return (
    <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Two-Factor Authentication</h2>

      {status === 'loading' && <p className="text-sm text-white/40">Loading…</p>}

      {status === 'none' && (
        <>
          <p className="text-sm text-white/60 leading-relaxed">
            Add a phone number so signing in also requires a text-message code, not just your password.
          </p>
          <button onClick={startEnroll} className="w-full bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm">
            Set Up 2FA
          </button>
        </>
      )}

      {status === 'enrolling-phone' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+15551234567"
              className={fieldClass}
            />
            <p className="text-[11px] text-white/30 mt-1">Include the country code, e.g. +1 for the US.</p>
          </div>
          {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
          <button onClick={sendCode} disabled={busy || !phone.trim()} className="w-full bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {busy ? 'Sending…' : 'Send Code'}
          </button>
        </div>
      )}

      {status === 'enrolling-code' && (
        <div className="space-y-3">
          <p className="text-sm text-white/60">Enter the code we texted to {phone}.</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className={`${fieldClass} text-center tracking-[0.3em] font-semibold`}
          />
          {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
          <button onClick={confirmCode} disabled={busy || code.length < 6} className="w-full bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {busy ? 'Verifying…' : 'Verify & Activate'}
          </button>
        </div>
      )}

      {status === 'enrolled' && (
        <>
          <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
            <ShieldCheck size={16} className="text-green-400 shrink-0" />
            <p className="text-sm text-green-300">
              2FA is active{profile?.phone ? <> — texting ****{profile.phone.slice(-4)}</> : null}.
            </p>
          </div>
          {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
          <button
            onClick={remove}
            disabled={busy}
            className="w-full bg-red-500/10 text-red-400 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
          >
            {busy ? 'Removing…' : 'Remove 2FA'}
          </button>
        </>
      )}
    </div>
  )
}

export default function Settings() {
  const { profile, loading: authLoading, signOut, setProfileDirect } = useAuth()
  const company = profile?.companies
  const [searchParams] = useSearchParams()

  const [teamSize, setTeamSize] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamActionErr, setTeamActionErr] = useState('')
  const [busyMemberId, setBusyMemberId] = useState(null)
  // Role changes are staged in the dropdown, not applied on every keystroke
  // of a select — a member id only appears here between picking a new role
  // and hitting Save, so the button can tell "nothing changed yet" apart
  // from "there's an unsaved change" and the row shows a real Save action
  // instead of silently committing on change with no confirmation.
  const [pendingRoles, setPendingRoles] = useState({})
  const [savedMemberId, setSavedMemberId] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveErr, setSaveErr]   = useState('')
  // Stripe Checkout/the billing portal both redirect back to
  // /settings?tab=billing, so the tab needs to land there directly rather
  // than always defaulting to 'account'.
  const [activeTab, setActiveTab] = useState(
    BILLING_ENABLED && searchParams.get('tab') === 'billing' ? 'billing' : 'account'
  )
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingErr, setBillingErr] = useState('')

  const [name, setName]               = useState(profile?.full_name ?? '')
  const [phone, setPhone]             = useState(profile?.phone ?? '')
  const [companyName, setCompanyName] = useState(company?.name ?? '')
  const [cageCode, setCageCode]       = useState(company?.cage_code ?? '')
  const [uei, setUei]                 = useState(company?.uei ?? '')
  const [naics, setNaics]             = useState(company?.naics_codes?.join(', ') ?? '')
  const [samExpiry, setSamExpiry]     = useState(company?.sam_expiry ?? '')
  const [sdvosb, setSdvosb]           = useState(company?.sdvosb ?? false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [pwSaving, setPwSaving]       = useState(false)
  const [pwSaved, setPwSaved]         = useState(false)
  const [pwMsg, setPwMsg]             = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('driver')
  const [inviting, setInviting]       = useState(false)
  const [inviteMsg, setInviteMsg]     = useState('')

  useEffect(() => {
    if (!profile?.company_id) return
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .then(({ count }) => setTeamSize(count ?? 1))
  }, [profile?.company_id])

  const loadTeam = useCallback(() => {
    if (!profile?.company_id) return
    setTeamLoading(true)
    // pay_percent is compensation data — only pull it into a non-owner's
    // client state when they'd actually be allowed to see it (nobody but
    // the owner here; a driver views their own rate on a separate,
    // self-scoped earnings page instead).
    const columns = profile.role === 'owner'
      ? 'id, full_name, role, phone, pay_percent, created_at'
      : 'id, full_name, role, phone, created_at'
    supabase
      .from('profiles')
      .select(columns)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setTeamMembers(data ?? [])
        setTeamLoading(false)
      })
  }, [profile?.company_id, profile?.role])

  useEffect(() => { loadTeam() }, [loadTeam])

  async function changeRole(memberId, role) {
    setBusyMemberId(memberId)
    setTeamActionErr('')
    try {
      const { data, error } = await invokeFn('manage-team', {
        body: { action: 'update_role', target_id: memberId, role },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      loadTeam()
      return true
    } catch (err) {
      setTeamActionErr(err.message)
      return false
    } finally {
      setBusyMemberId(null)
    }
  }

  async function saveRole(memberId) {
    const role = pendingRoles[memberId]
    if (!role) return
    const ok = await changeRole(memberId, role)
    if (!ok) return
    setPendingRoles(p => {
      const { [memberId]: _discard, ...rest } = p
      return rest
    })
    setSavedMemberId(memberId)
    setTimeout(() => setSavedMemberId(id => (id === memberId ? null : id)), 2000)
  }

  async function updatePayPercent(memberId, payPercent) {
    setBusyMemberId(memberId)
    setTeamActionErr('')
    try {
      const { data, error } = await invokeFn('manage-team', {
        body: { action: 'update_pay_percent', target_id: memberId, pay_percent: payPercent },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      loadTeam()
    } catch (err) {
      setTeamActionErr(err.message)
    } finally {
      setBusyMemberId(null)
    }
  }

  async function removeMember(memberId) {
    if (!window.confirm('Remove this team member? They will lose access to this company.')) return
    setBusyMemberId(memberId)
    setTeamActionErr('')
    try {
      const { data, error } = await invokeFn('manage-team', {
        body: { action: 'remove', target_id: memberId },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      loadTeam()
      setTeamSize(s => (s != null ? s - 1 : s))
    } catch (err) {
      setTeamActionErr(err.message)
    } finally {
      setBusyMemberId(null)
    }
  }

  // Sync form state if profile reloads
  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
    if (profile?.phone)      setPhone(profile.phone)
    if (company?.name)        setCompanyName(company.name)
    if (company?.cage_code)   setCageCode(company.cage_code)
    if (company?.uei)         setUei(company.uei)
    if (company?.naics_codes) setNaics(company.naics_codes.join(', '))
    if (company?.sam_expiry)  setSamExpiry(company.sam_expiry)
    if (company?.sdvosb != null) setSdvosb(company.sdvosb)
  }, [profile?.id])

  async function changePassword() {
    if (newPassword.length < 6) { setPwMsg('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPw) { setPwMsg('Passwords do not match.'); return }
    setPwSaving(true)
    setPwMsg('')
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) { setPwMsg(`Error: ${error.message}`) }
      else {
        setNewPassword(''); setConfirmPw('')
        setPwSaved(true); setPwMsg('')
        setTimeout(() => setPwSaved(false), 2500)
      }
    } catch (err) {
      setPwMsg(`Error: ${err.message}`)
    } finally {
      setPwSaving(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaveErr('')
    try {
      // The account tab only ever touches the caller's own name/phone — it
      // must not also resubmit company fields, both because a driver isn't
      // allowed to (upsert-company now rejects that server-side) and because
      // an owner/dispatcher saving their own name shouldn't silently rewrite
      // company info from whatever's left in this form's local state.
      const naicsCodes = naics.split(',').map(s => s.trim()).filter(Boolean)
      const body = activeTab === 'company'
        ? {
            name: companyName,
            cage_code: cageCode || null,
            uei: uei || null,
            naics_codes: naicsCodes,
            sam_expiry: samExpiry || null,
            sdvosb,
            full_name: name,
            phone: phone || null,
            company_id: company?.id ?? null,
          }
        : {
            full_name: name,
            phone: phone || null,
            company_id: company?.id ?? null,
            skip_company: true,
          }
      const { data, error: fnErr } = await invokeFn('upsert-company', { body })
      if (fnErr) throw new Error(fnErr.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.profile) throw new Error('Save did not complete — please try again.')
      setProfileDirect(data.profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function inviteUser() {
    if (!inviteEmail) return
    setInviting(true)
    setInviteMsg('')
    // Routed through manage-team rather than calling signInWithOtp directly
    // — inviting has to be enforced server-side (owner/dispatcher only, and
    // a dispatcher can't grant ownership), which a client-only check can't
    // guarantee since nothing stops a crafted request straight to the API.
    const { data, error } = await invokeFn('manage-team', {
      body: { action: 'invite', email: inviteEmail, role: inviteRole },
    })
    if (error) setInviteMsg(`Error: ${error.message}`)
    else if (data?.error) setInviteMsg(`Error: ${data.error}`)
    else setInviteMsg(`Invite sent to ${inviteEmail}`)
    setInviteEmail('')
    setInviting(false)
  }

  // Editing is limited to owner/dispatcher ("management") — company info
  // stays hidden from drivers entirely, but the team roster is fine to view
  // (read-only, no invite/role controls; those are hidden further down and,
  // more importantly, enforced server-side in upsert-company/manage-team).
  const canManage = profile?.role === 'owner' || profile?.role === 'dispatcher'
  const isOwner = profile?.role === 'owner'
  const tabs = [
    'account',
    'security',
    ...(canManage ? ['company'] : []),
    ...(BILLING_ENABLED && isOwner ? ['billing'] : []),
    'team',
  ]

  // Billing is owner-only (stricter than canManage) since these actions
  // create/change a real payment obligation, not just an edit to company
  // info a dispatcher can already touch.
  async function startCheckout(interval) {
    setBillingLoading(true); setBillingErr('')
    try {
      const { data, error } = await invokeFn('create-checkout-session', {
        body: {
          plan: company?.plan ?? 'standard',
          interval,
          context: 'settings',
          return_to_origin: window.location.origin,
        },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.url) throw new Error('Could not start checkout — please try again.')
      window.location.href = data.url
    } catch (err) {
      setBillingErr(err.message)
      setBillingLoading(false)
    }
  }

  async function openBillingPortal() {
    setBillingLoading(true); setBillingErr('')
    try {
      const { data, error } = await invokeFn('create-billing-portal-session', {
        body: { return_to_origin: window.location.origin },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.url) throw new Error('Could not open billing portal — please try again.')
      window.location.href = data.url
    } catch (err) {
      setBillingErr(err.message)
      setBillingLoading(false)
    }
  }

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Settings" />

      <div className="flex border-b border-white/[0.08] bg-navy-900 px-4 gap-4 md:px-8">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`py-3 text-xs font-semibold capitalize transition-colors border-b-2
              ${activeTab === t ? 'border-white text-white' : 'border-transparent text-white/40'}`}>
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {/* ── Account tab ── */}
        {activeTab === 'account' && (
          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Account</h2>
            <div>
              <label className="block text-xs text-white/50 mb-1">Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Role</label>
              <p className="text-sm text-white/70">{roleLabel(profile?.role)}</p>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Email</label>
              <p className="text-sm text-white/50">Managed by Auth</p>
            </div>
            <div className="pt-2 border-t border-white/[0.07] space-y-3">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Change Password</h3>
              <div>
                <label className="block text-xs text-white/50 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Confirm Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" className={fieldClass} />
              </div>
              {pwMsg && (
                <p className={`text-xs font-medium ${pwMsg.startsWith('Error') || pwMsg.startsWith('Password') ? 'text-red-400' : 'text-green-400'}`}>
                  {pwMsg}
                </p>
              )}
              <button type="button" onClick={changePassword} disabled={pwSaving || !newPassword || !confirmPw}
                className={`w-full font-bold py-2.5 rounded-xl disabled:opacity-50 text-sm transition-colors ${pwSaved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}>
                {pwSaving ? 'Updating…' : pwSaved ? '✓ Password Updated' : 'Set Password'}
              </button>
            </div>
          </div>
        )}

        {/* ── Security tab ── */}
        {activeTab === 'security' && (
          <SecurityTab profile={profile} setProfileDirect={setProfileDirect} />
        )}

        {/* ── Company tab ── */}
        {activeTab === 'company' && (
          <>
            {/* Company info card */}
            {company && (
              <div className="bg-navy-700 rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="bg-gradient-to-r from-brand-600/20 to-transparent px-4 py-4 border-b border-white/[0.06] flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-600/30 border border-brand-600/40 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-brand-300" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-base leading-tight">{company.name}</p>
                      {teamSize != null && (
                        <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                          <Users size={10} />
                          {teamSize} team member{teamSize !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {company.sdvosb && (
                    <div className="shrink-0 flex items-center gap-1 bg-brand-600/20 text-brand-300 border border-brand-600/30 text-[10px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide">
                      <Shield size={10} />
                      SDVOSB
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
                  {[
                    { icon: Hash,     label: 'CAGE Code', value: company.cage_code },
                    { icon: Hash,     label: 'UEI',       value: company.uei },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-navy-700 px-4 py-3">
                      <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Icon size={9} />{label}
                      </p>
                      <p className="text-sm text-white font-medium">{value || <span className="text-white/25">—</span>}</p>
                    </div>
                  ))}
                  <div className="bg-navy-700 px-4 py-3 col-span-2">
                    <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">NAICS Codes</p>
                    <p className="text-sm text-white font-medium">
                      {company.naics_codes?.filter(Boolean).length
                        ? company.naics_codes.join(', ')
                        : <span className="text-white/25">—</span>}
                    </p>
                  </div>
                  <div className="bg-navy-700 px-4 py-3 col-span-2">
                    <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Calendar size={9} />SAM.gov Expiry
                    </p>
                    <p className="text-sm text-white font-medium">
                      {company.sam_expiry
                        ? safeFormatDate(company.sam_expiry, 'MMMM d, yyyy')
                        : <span className="text-white/25">Not set</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit form */}
            <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Edit Company</h2>
              <div>
                <label className="block text-xs text-white/50 mb-1">Company Name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">CAGE Code</label>
                  <input value={cageCode} onChange={e => setCageCode(e.target.value)} placeholder="8ABC1" className={fieldClass} />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">UEI</label>
                  <input value={uei} onChange={e => setUei(e.target.value)} placeholder="ABCDEF123456" className={fieldClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">NAICS Codes <span className="text-white/25">(comma separated)</span></label>
                <input value={naics} onChange={e => setNaics(e.target.value)} placeholder="492110, 621610" className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">SAM.gov Expiry Date</label>
                <input type="date" value={samExpiry} onChange={e => setSamExpiry(e.target.value)} className={fieldClass} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  className={`w-12 h-6 rounded-full transition-colors ${sdvosb ? 'bg-brand-600' : 'bg-white/20'} relative`}
                  onClick={() => setSdvosb(!sdvosb)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sdvosb ? 'translate-x-6' : ''}`} />
                </div>
                <span className="text-sm text-white/70">SDVOSB Certified</span>
              </label>
            </div>
          </>
        )}

        {/* ── Billing tab ── */}
        {BILLING_ENABLED && activeTab === 'billing' && company && (
          <>
            {company.subscription_status === 'past_due' && (
              <AlertBanner type="error" message="There was a problem with your last payment. Update your payment method to avoid losing access." />
            )}
            {company.subscription_status === 'canceled' && (
              <AlertBanner type="error" message="Your subscription was canceled. Reactivate to keep using Convoy." />
            )}

            <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Current Plan</h2>
                  <p className="text-white font-bold text-lg mt-1">{planLabel(company.plan)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${
                  company.subscription_status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : company.subscription_status === 'trialing' ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {company.subscription_status.replace('_', ' ')}
                </span>
              </div>

              {company.subscription_status === 'trialing' && (
                <p className="text-sm text-white/50">
                  {Math.max(0, Math.ceil((new Date(company.trial_ends_at) - new Date()) / 86400000))} days left in your trial.
                  ${planPrice(company.plan, 'monthly')}/mo after your trial ends.
                </p>
              )}
              {company.subscription_status === 'active' && company.current_period_end && (
                <p className="text-sm text-white/50">
                  Renews {safeFormatDate(company.current_period_end, 'MMMM d, yyyy')}.
                </p>
              )}

              {billingErr && <p className="text-red-400 text-xs font-medium">{billingErr}</p>}

              {company.subscription_status === 'trialing' && (
                <button type="button" onClick={() => startCheckout('monthly')} disabled={billingLoading}
                  className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {billingLoading ? 'Loading…' : 'Add Payment Method'}
                </button>
              )}
              {company.subscription_status === 'active' && (
                <button type="button" onClick={openBillingPortal} disabled={billingLoading}
                  className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {billingLoading ? 'Loading…' : 'Manage Billing'}
                </button>
              )}
              {company.subscription_status === 'past_due' && (
                <button type="button" onClick={openBillingPortal} disabled={billingLoading}
                  className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {billingLoading ? 'Loading…' : 'Update Payment Method'}
                </button>
              )}
              {company.subscription_status === 'canceled' && (
                <button type="button" onClick={() => startCheckout('monthly')} disabled={billingLoading}
                  className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {billingLoading ? 'Loading…' : 'Reactivate'}
                </button>
              )}
            </div>

            <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-2">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">Plans</h2>
              {Object.entries(PLAN_META).map(([key, meta]) => (
                <div key={key} className={`rounded-xl p-3 border ${company.plan === key ? 'border-brand-600/50 bg-brand-600/5' : 'border-white/[0.07]'}`}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-white font-semibold">{meta.label}</p>
                    <p className="text-sm text-white/70">${meta.monthlyPrice}/mo</p>
                  </div>
                  <p className="text-xs text-white/40 mt-1">{meta.features.join(', ')}.</p>
                </div>
              ))}
              <p className="text-xs text-white/30 pt-1">
                To switch plans, use Manage Billing above. It opens Stripe's billing portal.
              </p>
            </div>
          </>
        )}

        {/* ── Team tab ── */}
        {activeTab === 'team' && (
          <>
          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Team Members</h2>
            {teamActionErr && <p className="text-red-400 text-xs font-medium">{teamActionErr}</p>}
            {teamLoading && <p className="text-xs text-white/40">Loading…</p>}
            {!teamLoading && teamMembers.length === 0 && (
              <p className="text-xs text-white/40">No team members yet.</p>
            )}
            <div className="space-y-2">
              {teamMembers.map(member => {
                const isSelf = member.id === profile?.id
                const initials = member.full_name?.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                const busy = busyMemberId === member.id
                const canEditPay = profile?.role === 'owner' && member.role === 'driver'
                return (
                  <div key={member.id} className="bg-navy-800 rounded-xl px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {member.full_name || 'Unnamed'} {isSelf && <span className="text-white/30 font-normal">(you)</span>}
                        </p>
                        <p className="text-xs text-white/40">{member.phone ?? 'No phone'}</p>
                      </div>
                      {profile?.role === 'owner' && !isSelf ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={pendingRoles[member.id] ?? member.role}
                            disabled={busy}
                            onChange={e => setPendingRoles(p => ({ ...p, [member.id]: e.target.value }))}
                            className="bg-navy-700 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                          >
                            <option value="owner">Admin</option>
                            <option value="dispatcher">Dispatcher</option>
                            <option value="driver">Driver</option>
                          </select>
                          {pendingRoles[member.id] && pendingRoles[member.id] !== member.role ? (
                            <button
                              type="button"
                              onClick={() => saveRole(member.id)}
                              disabled={busy}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors ${
                                savedMemberId === member.id ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'
                              }`}
                            >
                              {busy ? 'Saving…' : savedMemberId === member.id ? '✓ Saved' : 'Save'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeMember(member.id)}
                              disabled={busy}
                              className="text-xs text-red-400 font-medium bg-red-500/10 px-2 py-1.5 rounded-lg disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-white/50 shrink-0 px-2 py-1">{roleLabel(member.role)}</span>
                      )}
                    </div>
                    {canEditPay && (
                      <div className="flex items-center gap-2 pl-11">
                        <label className="text-xs text-white/40 shrink-0">Pay % of run revenue</label>
                        <input
                          key={member.pay_percent ?? 'unset'}
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          defaultValue={member.pay_percent ?? ''}
                          disabled={busy}
                          onBlur={e => {
                            const v = e.target.value
                            if (v === '' || Number(v) === Number(member.pay_percent)) return
                            updatePayPercent(member.id, Number(v))
                          }}
                          placeholder="e.g. 30"
                          className="w-20 bg-navy-700 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {canManage && (
            <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Invite Team Member</h2>
              <p className="text-xs text-white/40">They'll receive a magic link to set up their account.</p>
              <div>
                <label className="block text-xs text-white/50 mb-1">Email Address</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="driver@example.com" className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={fieldClass}>
                  <option value="driver">Driver</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="owner">Admin</option>
                </select>
              </div>
              {inviteMsg && (
                <p className={`text-xs font-medium ${inviteMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {inviteMsg}
                </p>
              )}
              <button type="button" onClick={inviteUser} disabled={inviting || !inviteEmail}
                className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          )}
          </>
        )}

        {activeTab !== 'team' && activeTab !== 'billing' && activeTab !== 'security' && (
          <>
            {saveErr && <p className="text-red-400 text-xs font-medium px-1">{saveErr}</p>}
            <button type="submit" disabled={saving || authLoading}
              className={`w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}>
              {authLoading ? 'Loading…' : saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </>
        )}
      </form>

      <div className="px-4 mt-4 md:px-8">
        <button onClick={signOut} className="w-full bg-white/10 text-white/70 font-semibold py-3 rounded-xl active:bg-white/20">
          Sign Out
        </button>
      </div>
    </div>
  )
}
