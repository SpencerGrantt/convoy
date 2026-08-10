import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import ExpiryBadge from '../components/ui/ExpiryBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { safeFormatDate } from '../lib/dates'
import { ShieldCheck } from 'lucide-react'

const DOC_LABELS = {
  cdl:              'CDL',
  hipaa_cert:       'HIPAA Cert',
  background_check: 'BG Check',
  insurance:        'Insurance',
}

// Read-only view of the signed-in driver's own compliance_docs rows —
// mirrors the expiry color-coding on the owner/dispatcher Drivers page
// (via the shared ExpiryBadge) but scoped client-side to owner_id = self.
export default function MyCompliance() {
  const { profile } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('compliance_docs')
        .select('*')
        .eq('owner_id', profile.id)
        .order('expiry_date', { ascending: true })
      if (!cancelled) {
        setDocs(data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [profile?.id])

  if (loading) return <div className="pb-24"><TopBar title="My Documents" /><LoadingSpinner /></div>

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="My Documents" />
      <div className="px-4 pt-4 space-y-3 md:px-8 md:pt-6">

        {docs.length === 0 && (
          <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-8 text-center space-y-2">
            <ShieldCheck size={32} className="text-white/20 mx-auto" />
            <p className="text-white font-semibold">No documents on file</p>
            <p className="text-white/40 text-sm">Your dispatcher or admin adds compliance documents for you.</p>
          </div>
        )}

        {docs.map(doc => (
          <div key={doc.id} className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm">{DOC_LABELS[doc.doc_type] ?? doc.doc_type.replace('_', ' ')}</p>
              <p className="text-xs text-white/40 mt-0.5">
                {doc.expiry_date ? `Expires ${safeFormatDate(doc.expiry_date, 'MMM d, yyyy')}` : 'No expiry set'}
              </p>
              {doc.notes && <p className="text-xs text-white/30 mt-1 line-clamp-2">{doc.notes}</p>}
            </div>
            <ExpiryBadge date={doc.expiry_date} />
          </div>
        ))}
      </div>
    </div>
  )
}
