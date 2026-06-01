import { useFinances } from '../hooks/useFinances'
import MetricCard from '../components/ui/MetricCard'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

function fmt(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function Finances() {
  const { revenue, expenses, invoices, loading, totalRevenue, totalExpenses, netProfit, outstanding } = useFinances()

  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})
  const chartData = Object.entries(expenseByCategory).map(([name, amount]) => ({ name, amount }))

  return (
    <div className="pb-24">
      <TopBar title="Finances" />
      {loading ? <LoadingSpinner /> : (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Revenue MTD"   value={fmt(totalRevenue)}  icon="💵" color="green"  />
            <MetricCard label="Expenses MTD"  value={fmt(totalExpenses)} icon="🧾" color="yellow" />
            <MetricCard label="Net Profit"    value={fmt(netProfit)}     icon="📈" color={netProfit >= 0 ? 'green' : 'red'} />
            <MetricCard label="Outstanding"   value={fmt(outstanding)}   icon="⏳" color="red"    />
          </div>

          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Expenses by Category</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Invoices</h2>
            <div className="space-y-2">
              {invoices.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No invoices yet</p>}
              {invoices.map(inv => (
                <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">#{inv.invoice_number ?? inv.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{inv.contracts?.name ?? '—'}</p>
                    {inv.period_start && (
                      <p className="text-xs text-gray-400">
                        {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{fmt(inv.total_amount ?? 0)}</p>
                    <StatusPill status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
