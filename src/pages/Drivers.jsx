import { useDrivers } from '../hooks/useDrivers'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { differenceInDays, parseISO, format } from 'date-fns'

function complianceDocs(docs = []) {
  return ['cdl', 'hipaa_cert', 'background_check', 'insurance'].map(type => {
    const doc = docs.find(d => d.doc_type === type)
    return { type, doc }
  })
}

function ExpiryBadge({ date }) {
  if (!date) return <span className="text-gray-300 text-xs">—</span>
  const d = differenceInDays(parseISO(date), new Date())
  const color = d <= 30 ? 'text-red-600 bg-red-50' : d <= 60 ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {format(parseISO(date), 'MMM d, yy')}
    </span>
  )
}

const docLabels = { cdl: 'CDL', hipaa_cert: 'HIPAA', background_check: 'BG Check', insurance: 'Insurance' }

export default function Drivers() {
  const { drivers, loading } = useDrivers()

  return (
    <div className="pb-24">
      <TopBar title="Drivers" />
      <div className="px-4 pt-4 space-y-3">
        {loading ? <LoadingSpinner /> : (
          <>
            {drivers.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No drivers yet</p>}
            {drivers.map(driver => {
              const initials = driver.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?'
              const docs = complianceDocs(driver.compliance_docs)
              return (
                <div key={driver.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{driver.full_name}</p>
                      <p className="text-xs text-gray-400">{driver.phone ?? 'No phone'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {docs.map(({ type, doc }) => (
                      <div key={type} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1">
                        <span className="text-xs text-gray-500">{docLabels[type]}</span>
                        <ExpiryBadge date={doc?.expiry_date} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
