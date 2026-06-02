import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'

export default function Settings() {
  const { profile, signOut } = useAuth()
  const company = profile?.companies
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState(profile?.full_name ?? '')
  const [companyName, setCompanyName] = useState(company?.name ?? '')

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await Promise.all([
      supabase.from('profiles').update({ full_name: name }).eq('id', profile.id),
      supabase.from('companies').update({ name: companyName }).eq('id', company?.id),
    ])
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700'

  return (
    <div className="pb-24">
      <TopBar title="Settings" />
      <div className="px-4 pt-4 space-y-6">
        <form onSubmit={save} className="space-y-4">
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
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} className={field} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <span>CAGE: <strong className="text-gray-700">{company?.cage_code ?? '—'}</strong></span>
              <span>UEI: <strong className="text-gray-700">{company?.uei ?? '—'}</strong></span>
              <span>SDVOSB: <strong className="text-gray-700">{company?.sdvosb ? 'Yes' : 'No'}</strong></span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-900 text-brand-50 font-bold py-3 rounded-xl disabled:opacity-50"
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        <button
          onClick={signOut}
          className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl active:bg-gray-200"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
