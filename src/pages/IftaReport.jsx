import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import MetricCard from '../components/ui/MetricCard'
import { Download, MapPinned } from 'lucide-react'

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

const QUARTERS = [
  { value: 1, label: 'Q1', months: 'Jan – Mar' },
  { value: 2, label: 'Q2', months: 'Apr – Jun' },
  { value: 3, label: 'Q3', months: 'Jul – Sep' },
  { value: 4, label: 'Q4', months: 'Oct – Dec' },
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Local (not UTC) yyyy-MM-dd — entry_date is a plain date column, so this
// just needs to match the calendar quarter, no timezone conversion involved.
function toDateStr(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

// Quarter -> [startStr, endStr] as inclusive yyyy-MM-dd bounds, purely from
// the year/quarter number — no tax-relevant logic, just a calendar range.
function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1
  const start = toDateStr(year, startMonth, 1)
  const endMonthIndex = startMonth + 3 // 1-indexed month after the quarter
  const lastDay = new Date(year, endMonthIndex - 1, 0).getDate() // day 0 of next month = last day of quarter's last month
  const end = toDateStr(year, startMonth + 2, lastDay)
  return [start, end]
}

function currentQuarter() {
  return Math.floor(new Date().getMonth() / 3) + 1
}

function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function IftaReport() {
  const { profile } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [quarter, setQuarter] = useState(currentQuarter())
  const [vehicleId, setVehicleId] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('vehicles').select('id, name, plate, make, model')
      .then(({ data }) => setVehicles(data ?? []))
  }, [])

  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [startStr, endStr] = quarterRange(year, quarter)
      let query = supabase
        .from('mileage_entries')
        .select('jurisdiction, miles, vehicle_id')
        .gte('entry_date', startStr)
        .lte('entry_date', endStr)
      if (vehicleId) query = query.eq('vehicle_id', vehicleId)
      const { data } = await query
      if (cancelled) return
      setEntries(data ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [profile?.company_id, year, quarter, vehicleId])

  const jurisdictionRows = useMemo(() => {
    const map = new Map()
    for (const e of entries) {
      map.set(e.jurisdiction, (map.get(e.jurisdiction) ?? 0) + Number(e.miles))
    }
    return Array.from(map.entries())
      .map(([jurisdiction, miles]) => ({ jurisdiction, miles }))
      .sort((a, b) => b.miles - a.miles)
  }, [entries])

  const totalMiles = jurisdictionRows.reduce((s, r) => s + r.miles, 0)
  const vehicleLabel = vehicleId
    ? (() => {
        const v = vehicles.find(v => v.id === vehicleId)
        return v ? (v.name || `${v.make} ${v.model}`) : ''
      })()
    : 'All Vehicles'

  function exportCsv() {
    const rows = [
      ['IFTA Quarterly Mileage Report'],
      [`Quarter: Q${quarter} ${year}`],
      [`Vehicle: ${vehicleLabel}`],
      [],
      ['Jurisdiction', 'Miles'],
      ...jurisdictionRows.map(r => [r.jurisdiction, r.miles.toFixed(1)]),
      ['Total', totalMiles.toFixed(1)],
    ]
    downloadCsv(`ifta-mileage-Q${quarter}-${year}.csv`, rows)
  }

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return [current - 2, current - 1, current, current + 1]
  }, [])

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="IFTA Report" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {/* Quarter / year / vehicle filters */}
        <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <MapPinned size={16} className="text-brand-300" />
            </div>
            <h2 className="text-sm font-semibold text-white">Quarterly Mileage by Jurisdiction</h2>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {QUARTERS.map(q => (
              <button
                key={q.value}
                onClick={() => setQuarter(q.value)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  quarter === q.value ? 'bg-brand-600 text-white' : 'bg-navy-800 text-white/50'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-white/50 mb-1">Year</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className={fieldClass}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Vehicle</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={fieldClass}>
                <option value="">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name || `${v.make} ${v.model}`}{v.plate ? ` · ${v.plate}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <MetricCard
          label={`Total Miles — Q${quarter} ${year}`}
          value={loading ? '…' : totalMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          color="blue"
          sub={vehicleLabel}
        />

        {/* Jurisdiction table */}
        <div className="bg-navy-700 rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Miles by Jurisdiction</p>
            <button
              onClick={exportCsv}
              disabled={loading || jurisdictionRows.length === 0}
              className="flex items-center gap-1.5 bg-white/10 text-white/80 font-semibold px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 active:bg-white/15 transition-colors"
            >
              <Download size={12} />
              Export CSV
            </button>
          </div>

          {loading && (
            <p className="text-sm text-white/40 text-center py-8">Loading…</p>
          )}

          {!loading && jurisdictionRows.length === 0 && (
            <p className="text-sm text-white/40 text-center py-8">No mileage logged for this quarter.</p>
          )}

          {!loading && jurisdictionRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-white/35 uppercase tracking-wide border-t border-white/[0.06]">
                    <th className="text-left font-semibold px-4 py-2">Jurisdiction</th>
                    <th className="text-right font-semibold px-4 py-2">Miles</th>
                  </tr>
                </thead>
                <tbody>
                  {jurisdictionRows.map(r => (
                    <tr key={r.jurisdiction} className="border-t border-white/[0.06]">
                      <td className="px-4 py-2.5 text-white/80 font-medium">{r.jurisdiction}</td>
                      <td className="px-4 py-2.5 text-right text-white font-semibold">
                        {r.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-white/[0.12]">
                    <td className="px-4 py-3 text-white font-bold">Total</td>
                    <td className="px-4 py-3 text-right text-white font-bold">
                      {totalMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] text-white/30 px-1 leading-relaxed">
          This report shows raw miles logged per jurisdiction only. It does not calculate tax owed —
          use these totals with your IFTA filing software or accountant.
        </p>
      </div>
    </div>
  )
}
