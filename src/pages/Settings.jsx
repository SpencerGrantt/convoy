import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, invokeFn } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import { format, parseISO } from 'date-fns'
import { Shield, Users, Calendar, Hash, Building2 } from 'lucide-react'

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

export default function Settings() {
  const { profile, loading: authLoading, signOut, setProfileDirect } = useAuth()
  const company = profile?.companies

  const [teamSize, setTeamSize] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamActionErr, setTeamActionErr] = useState('')
  const [busyMemberId, setBusyMemberId] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveErr, setSaveErr]   = useState('')
  const [activeTab, setActiveTab] = useState('account')

  const [name, setName]               = useState(profile?.full_name ?? '')
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
    supabase
      .from('profiles')
      .select('id, full_name, role, phone, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setTeamMembers(data ?? [])
        setTeamLoading(false)
      })
  }, [profile?.company_id])

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
      const naicsCodes = naics.split(',').map(s => s.trim()).filter(Boolean)
      const { data, error: fnErr } = await invokeFn('upsert-company', {
        body: {
          name: companyName,
          cage_code: cageCode || null,
          uei: uei || null,
          naics_codes: naicsCodes,
          sam_expiry: samExpiry || null,
          sdvosb,
          full_name: name,
          company_id: company?.id ?? null,
        },
      })
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
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail,
      options: {
        emailRedirectTo: window.location.origin,
        data: { company_id: profile.company_id, role: inviteRole },
      },
    })
    if (error) setInviteMsg(`Error: ${error.message}`)
    else setInviteMsg(`Invite sent to ${inviteEmail}`)
    setInviteEmail('')
    setInviting(false)
  }

  const tabs = ['account', 'company', 'team']

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
              <label className="block text-xs text-white/50 mb-1">Role</label>
              <p className="text-sm text-white/70 capitalize">{profile?.role}</p>
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
                        ? format(parseISO(company.sam_expiry), 'MMMM d, yyyy')
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
                return (
                  <div key={member.id} className="flex items-center gap-3 bg-navy-800 rounded-xl px-3 py-2.5">
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
                          value={member.role}
                          disabled={busy}
                          onChange={e => changeRole(member.id, e.target.value)}
                          className="bg-navy-700 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                        >
                          <option value="owner">Owner</option>
                          <option value="dispatcher">Dispatcher</option>
                          <option value="driver">Driver</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          disabled={busy}
                          className="text-xs text-red-400 font-medium bg-red-500/10 px-2 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-white/50 capitalize shrink-0 px-2 py-1">{member.role}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

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
                <option value="owner">Owner</option>
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
          </>
        )}

        {activeTab !== 'team' && (
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
