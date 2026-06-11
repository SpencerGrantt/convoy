import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import { format, parseISO } from 'date-fns'

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

export default function Settings() {
  const { profile, loading: authLoading, signOut, refreshProfile } = useAuth()
  const company = profile?.companies
  const [teamSize, setTeamSize] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState('')
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

  useEffect(() => {
    if (!profile?.company_id) return
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .then(({ count }) => setTeamSize(count ?? 1))
  }, [profile?.company_id])

  async function changePassword() {
    if (newPassword.length < 6) { setPwMsg('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPw) { setPwMsg('Passwords do not match.'); return }
    setPwSaving(true)
    setPwMsg('')
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPwMsg(`Error: ${error.message}`)
      } else {
        setNewPassword('')
        setConfirmPw('')
        setPwSaved(true)
        setPwMsg('')
        setTimeout(() => setPwSaved(false), 2500)
      }
    } catch (err) {
      setPwMsg(`Error: ${err.message}`)
    } finally {
      setPwSaving(false)
    }
  }

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('driver')
  const [inviting, setInviting]       = useState(false)
  const [inviteMsg, setInviteMsg]     = useState('')

  function dbCall(query) {
    return Promise.race([
      query,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database did not respond — check RLS policies or connection')), 8000)),
    ])
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaveErr('')
    try {
      const naicsCodes = naics.split(',').map(s => s.trim()).filter(Boolean)
      const companyPayload = {
        name: companyName,
        cage_code: cageCode || null,
        uei: uei || null,
        naics_codes: naicsCodes,
        sam_expiry: samExpiry || null,
        sdvosb,
      }

      if (profile?.id) {
        const { error } = await dbCall(
          supabase.from('profiles').update({ full_name: name }).eq('id', profile.id)
        )
        if (error) throw new Error(error.message)
      }

      if (company?.id) {
        const { error } = await dbCall(
          supabase.from('companies').update(companyPayload).eq('id', company.id)
        )
        if (error) throw new Error(error.message)
      } else {
        const { data: newCo, error: createErr } = await dbCall(
          supabase.from('companies').insert(companyPayload).select().single()
        )
        if (createErr) throw new Error(createErr.message)
        const { error: linkErr } = await dbCall(
          supabase.from('profiles').update({ company_id: newCo.id }).eq('id', profile.id)
        )
        if (linkErr) throw new Error(linkErr.message)
        refreshProfile().catch(() => {})
      }

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
    const { data: { users } } = await supabase.auth.admin?.listUsers() ?? { data: { users: [] } }

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
            className={`py-3 text-xs font-semibold capitalize transition-colors border-b-2 ${activeTab === t ? 'border-white text-white' : 'border-transparent text-white/40'}`}>
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

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
              <p className="text-sm text-white/50">{profile?.id ? 'Managed by Supabase Auth' : '—'}</p>
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
              <button
                type="button"
                onClick={changePassword}
                disabled={pwSaving || !newPassword || !confirmPw}
                className={`w-full font-bold py-2.5 rounded-xl disabled:opacity-50 text-sm transition-colors ${pwSaved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}
              >
                {pwSaving ? 'Updating…' : pwSaved ? '✓ Password Updated' : 'Set Password'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'company' && company && (
          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3 mb-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-bold text-base leading-tight">{company.name || 'My Company'}</p>
                {teamSize != null && (
                  <p className="text-xs text-white/40 mt-0.5">{teamSize} team member{teamSize !== 1 ? 's' : ''}</p>
                )}
              </div>
              {company.sdvosb && (
                <span className="shrink-0 bg-brand-600/20 text-brand-300 border border-brand-600/30 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                  SDVOSB Certified
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1 border-t border-white/[0.07]">
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">CAGE</p>
                <p className="text-sm text-white font-medium">{company.cage_code || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">UEI</p>
                <p className="text-sm text-white font-medium">{company.uei || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">NAICS Codes</p>
                <p className="text-sm text-white font-medium">{company.naics_codes?.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">SAM Expiry</p>
                <p className="text-sm text-white font-medium">
                  {company.sam_expiry ? format(parseISO(company.sam_expiry), 'MMM d, yyyy') : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'company' && (
          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">{company?.id ? 'Edit Company' : 'Create Company'}</h2>
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
              <label className="block text-xs text-white/50 mb-1">NAICS Codes (comma separated)</label>
              <input value={naics} onChange={e => setNaics(e.target.value)} placeholder="492110, 621610" className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">SAM.gov Expiry Date</label>
              <input type="date" value={samExpiry} onChange={e => setSamExpiry(e.target.value)} className={fieldClass} />
            </div>
            <label className="flex items-center gap-3">
              <div
                className={`w-12 h-6 rounded-full transition-colors ${sdvosb ? 'bg-brand-600' : 'bg-white/20'} relative cursor-pointer`}
                onClick={() => setSdvosb(!sdvosb)}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sdvosb ? 'translate-x-6' : ''}`} />
              </div>
              <span className="text-sm text-white/70">SDVOSB Certified</span>
            </label>
          </div>
        )}

        {activeTab === 'team' && (
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
            <button type="button" onClick={inviteUser} disabled={inviting || !inviteEmail} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        )}

        {activeTab !== 'team' && (
          <>
            {saveErr && <p className="text-red-400 text-xs font-medium px-1">{saveErr}</p>}
            <button type="submit" disabled={saving || authLoading} className={`w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}>
              {authLoading ? 'Loading…' : saving ? 'Saving…' : saved ? '✓ Saved' : activeTab === 'company' && !company?.id ? 'Create Company' : 'Save Changes'}
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
