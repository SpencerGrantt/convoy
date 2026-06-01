import { useContracts } from '../hooks/useContracts'
import { useAuth } from '../hooks/useAuth'
import StatusPill from '../components/ui/StatusPill'
import AlertBanner from '../components/ui/AlertBanner'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { format, differenceInDays, parseISO } from 'date-fns'

export default function Contracts() {
  const { contracts, loading } = useContracts()
  const { profile } = useAuth()
  const company = profile?.companies
  const today = new Date()

  const expiring = contracts.filter(c => {
    if (!c.end_date) return false
    const d = differenceInDays(parseISO(c.end_date), today)
    return d >= 0 && d <= 30
  })

  return (
    <div className="pb-24">
      <TopBar title="Contracts" />
      <div className="px-4 pt-4 space-y-4">
        {expiring.map(c => (
          <AlertBanner
            key={c.id}
            type="warning"
            message={`"${c.name}" renews in ${differenceInDays(parseISO(c.end_date), today)} days`}
          />
        ))}

        {company && (
          <div className="bg-blue-900 text-white rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏛️</span>
              <p className="font-bold text-sm">{company.name}</p>
              {company.sdvosb && <span className="bg-blue-700 text-blue-100 text-xs px-1.5 py-0.5 rounded font-medium">SDVOSB</span>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-200">
              <span>CAGE: <strong className="text-white">{company.cage_code ?? '—'}</strong></span>
              <span>UEI: <strong className="text-white">{company.uei ?? '—'}</strong></span>
              <span className="col-span-2">NAICS: <strong className="text-white">{company.naics_codes?.join(', ') ?? '—'}</strong></span>
              {company.sam_expiry && (
                <span className="col-span-2">SAM Expiry: <strong className="text-white">{format(parseISO(company.sam_expiry), 'MMM d, yyyy')}</strong></span>
              )}
            </div>
          </div>
        )}

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contracts</h2>
        {loading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {contracts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No contracts yet</p>}
            {contracts.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <StatusPill status={c.status} />
                    </div>
                    <p className="text-xs text-gray-500">{c.agency} · #{c.contract_number}</p>
                    {c.annual_value && (
                      <p className="text-xs text-green-700 font-semibold mt-1">
                        ${Number(c.annual_value).toLocaleString()} / yr
                      </p>
                    )}
                  </div>
                  {c.end_date && (
                    <div className="text-right text-xs text-gray-400 shrink-0">
                      <p>Ends</p>
                      <p className="font-medium text-gray-600">{format(parseISO(c.end_date), 'MMM d, yy')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
