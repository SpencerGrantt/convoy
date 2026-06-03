import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'

export default function Settings() {
  const { profile, signOut } = useAuth()
  const company = profile?.companies
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

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaveErr('')
    try {
      const naicsCodes = naics.split(',').map(s => s.trim()).filter(Boolean)
      await Promise.all([
        supabase.from('profiles').update({ full_name: name }).eq('id', profile.id),
        supabase.from('companies').update({
          name: companyName,
          cage_code: cageCode || null,
          uei: uei || null,
          naics_codes: naicsCodes,
          sam_expiry: samExpiry || null,
          sdvosb,
        }).eq('id', company?.id),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveErr(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function inviteUser() {
    if (!inviteEmail) return
    setInviting(true)
    setInviteMsg('')
    // Send magic link — on first login AuthProvider creates profile
    // We pre-insert a placeholder profile with the correct company + role
    const { data: { users } } = await supabase.auth.admin?.listUsers() ?? { data: { users: [] } }

    // Use signInWithOtp to send invite email via Supabase
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

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700'
  const tabs = ['account', 'company', 'team']

  return (
    <div className="pb-24">
      <TopBar title="Settings" />

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white px-4 gap-4">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`py-3 text-xs font-semibold capitalize transition-colors border-b-2 ${activeTab === t ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="px-4 pt-4 space-y-4">

        {/* Account tab */}
        {activeTab === 'account' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <p className="text-sm text-gray-700 capitalize">{profile?.role}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <p className="text-sm text-gray-500">{profile?.id ? 'Managed by Supabase Auth' : '—'}</p>
            </div>
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Change Password</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={field}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  className={field}
                />
              </div>
              {pwMsg && (
                <p className={`text-xs font-medium ${pwMsg.startsWith('Error') || pwMsg.startsWith('Password') ? 'text-red-600' : 'text-green-600'}`}>
                  {pwMsg}
                </p>
              )}
              <button
                type="button"
                onClick={changePassword}
                disabled={pwSaving || !newPassword || !confirmPw}
                className={`w-full font-bold py-2.5 rounded-xl disabled:opacity-50 text-sm transition-colors ${pwSaved ? 'bg-green-600 text-white' : 'bg-brand-900 text-brand-50'}`}
              >
                {pwSaving ? 'Updating…' : pwSaved ? '✓ Password Updated' : 'Set Password'}
              </button>
            </div>
          </div>
        )}

        {/* Company tab */}
        {activeTab === 'company' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Company Profile</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} className={field} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">CAGE Code</label>
                <input value={cageCode} onChange={e => setCageCode(e.target.value)} placeholder="8ABC1" className={field} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">UEI</label>
                <input value={uei} onChange={e => setUei(e.target.value)} placeholder="ABCDEF123456" className={field} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">NAICS Codes (comma separated)</label>
              <input value={naics} onChange={e => setNaics(e.target.value)} placeholder="492110, 621610" className={field} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SAM.gov Expiry Date</label>
              <input type="date" value={samExpiry} onChange={e => setSamExpiry(e.target.value)} className={field} />
            </div>
            <label className="flex items-center gap-3">
              <div
                className={`w-12 h-6 rounded-full transition-colors ${sdvosb ? 'bg-brand-900' : 'bg-gray-200'} relative cursor-pointer`}
                onClick={() => setSdvosb(!sdvosb)}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sdvosb ? 'translate-x-6' : ''}`} />
              </div>
              <span className="text-sm text-gray-700">SDVOSB Certified</span>
            </label>
          </div>
        )}

        {/* Team tab */}
        {activeTab === 'team' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Invite Team Member</h2>
            <p className="text-xs text-gray-400">They'll receive a magic link to set up their account.</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="driver@example.com"
                className={field}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={field}>
                <option value="driver">Driver</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            {inviteMsg && (
              <p className={`text-xs font-medium ${inviteMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {inviteMsg}
              </p>
            )}
            <button
              type="button"
              onClick={inviteUser}
              disabled={inviting || !inviteEmail}
              className="w-full bg-brand-900 text-brand-50 font-bold py-3 rounded-xl disabled:opacity-50"
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        )}

        {activeTab !== 'team' && (
          <>
            {saveErr && <p className="text-red-600 text-xs font-medium px-1">{saveErr}</p>}
            <button
              type="submit"
              disabled={saving}
              className={`w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-brand-900 text-brand-50'}`}
            >
              {saving ? 'Saving…' : saved ? '✓ Changes Saved' : 'Save Changes'}
            </button>
          </>
        )}
      </form>

      <div className="px-4 mt-4">
        <button onClick={signOut} className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl active:bg-gray-200">
          Sign Out
        </button>
      </div>
    </div>
  )
}
