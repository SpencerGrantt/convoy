import { useState } from 'react'
import { useFinances } from '../hooks/useFinances'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import MetricCard from '../components/ui/MetricCard'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

const EXPENSE_CATEGORIES = ['fuel','driver_pay','insurance','maintenance','tolls','supplies','other']

function fmt(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-gray-900">{title}</p>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function RevenueForm({ companyId, contracts, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [contractId, setContractId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!amount) return
    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase.from('revenue_entries').insert({
        company_id: companyId,
        amount: parseFloat(amount),
        description,
        contract_id: contractId || null,
        entry_date: new Date().toISOString().slice(0, 10),
      })
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={field} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Lab specimen courier" className={field} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Contract</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={field}>
          <option value="">None</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {err && <p className="text-red-600 text-xs font-medium">{err}</p>}
      <button onClick={save} disabled={saving || !amount} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
        {saving ? 'Saving…' : 'Add Revenue'}
      </button>
    </div>
  )
}

function ExpenseForm({ companyId, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('fuel')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!amount) return
    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase.from('expense_entries').insert({
        company_id: companyId,
        amount: parseFloat(amount),
        category,
        description,
        entry_date: new Date().toISOString().slice(0, 10),
      })
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Category *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={field}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={field} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Gas — Van 01" className={field} />
      </div>
      {err && <p className="text-red-600 text-xs font-medium">{err}</p>}
      <button onClick={save} disabled={saving || !amount} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
        {saving ? 'Saving…' : 'Add Expense'}
      </button>
    </div>
  )
}

function InvoiceForm({ companyId, contracts, onSave, onClose }) {
  const [contractId, setContractId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [runs, setRuns] = useState([])
  const [fetched, setFetched] = useState(false)

  async function fetchRuns() {
    if (!contractId || !periodStart || !periodEnd) return
    const { data } = await supabase
      .from('runs')
      .select('id, dropoff_address, delivered_at, revenue_entries(amount)')
      .eq('contract_id', contractId)
      .eq('status', 'delivered')
      .gte('delivered_at', periodStart)
      .lte('delivered_at', periodEnd + 'T23:59:59')
    setRuns(data ?? [])
    setFetched(true)
  }

  const total = runs.reduce((sum, r) => sum + (r.revenue_entries?.[0]?.amount ?? 0), 0)

  const [err, setErr] = useState('')

  async function generate() {
    setSaving(true)
    setErr('')
    try {
      const num = `INV-${Date.now().toString().slice(-6)}`
      const { error } = await supabase.from('invoices').insert({
        company_id: companyId,
        contract_id: contractId || null,
        invoice_number: num,
        period_start: periodStart,
        period_end: periodEnd,
        total_amount: total,
        status: 'draft',
      })
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Contract *</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={field}>
          <option value="">Select contract</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period Start</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={field} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period End</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={field} />
        </div>
      </div>
      <button onClick={fetchRuns} className="w-full bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">
        Load Completed Runs
      </button>
      {fetched && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-500">{runs.length} runs found</p>
          {runs.map(r => (
            <div key={r.id} className="flex justify-between text-xs text-gray-600">
              <span className="truncate flex-1">{r.dropoff_address}</span>
              <span className="shrink-0 ml-2">{fmt(r.revenue_entries?.[0]?.amount ?? 0)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-1 flex justify-between text-sm font-bold text-gray-900">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>
      )}
      {err && <p className="text-red-600 text-xs font-medium">{err}</p>}
      {fetched && (
        <button onClick={generate} disabled={saving || !contractId} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
          {saving ? 'Generating…' : 'Generate Invoice'}
        </button>
      )}
    </div>
  )
}

export default function Finances() {
  const { profile } = useAuth()
  const { revenue, expenses, invoices, contracts, loading, totalRevenue, totalExpenses, netProfit, outstanding, refresh } = useFinances()
  const [sheet, setSheet] = useState(null) // 'revenue' | 'expense' | 'invoice'
  const companyId = profile?.company_id

  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})
  const chartData = Object.entries(expenseByCategory).map(([name, amount]) => ({ name, amount }))

  return (
    <div className="pb-24">
      <TopBar title="Finances" />
      <div className="px-4 pt-4 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Revenue MTD"  value={fmt(totalRevenue)}  color="green"  />
            <MetricCard label="Expenses MTD" value={fmt(totalExpenses)} color="yellow" />
            <MetricCard label="Net Profit"   value={fmt(netProfit)}     color={netProfit >= 0 ? 'green' : 'red'} />
            <MetricCard label="Outstanding"  value={fmt(outstanding)}   color="red"    />
          </div>

          {/* Quick add buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setSheet('revenue')} className="bg-green-50 text-green-700 font-semibold py-2.5 rounded-xl text-xs active:bg-green-100">+ Revenue</button>
            <button onClick={() => setSheet('expense')} className="bg-yellow-50 text-yellow-700 font-semibold py-2.5 rounded-xl text-xs active:bg-yellow-100">+ Expense</button>
            <button onClick={() => setSheet('invoice')} className="bg-brand-50 text-brand-700 font-semibold py-2.5 rounded-xl text-xs active:bg-brand-100">+ Invoice</button>
          </div>

          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Expenses by Category</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="amount" fill="#185FA5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent entries */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Revenue</p>
            {revenue.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No entries this month</p>}
            {revenue.slice(0, 5).map(r => (
              <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between mb-2">
                <p className="text-sm text-gray-700 truncate flex-1">{r.description || 'Revenue entry'}</p>
                <p className="text-sm font-bold text-green-700 ml-3">{fmt(r.amount)}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Expenses</p>
            {expenses.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No entries this month</p>}
            {expenses.slice(0, 5).map(e => (
              <div key={e.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-700">{e.description || e.category.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400 capitalize">{e.category.replace('_', ' ')}</p>
                </div>
                <p className="text-sm font-bold text-red-600 ml-3">{fmt(e.amount)}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Invoices</p>
            {invoices.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No invoices yet</p>}
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{inv.invoice_number ?? inv.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">{inv.contracts?.name ?? '—'}</p>
                  {inv.period_start && (
                    <p className="text-xs text-gray-400">{format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}</p>
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

      {sheet === 'revenue' && (
        <Sheet title="Add Revenue" onClose={() => setSheet(null)}>
          <RevenueForm companyId={companyId} contracts={contracts} onSave={refresh} onClose={() => setSheet(null)} />
        </Sheet>
      )}
      {sheet === 'expense' && (
        <Sheet title="Add Expense" onClose={() => setSheet(null)}>
          <ExpenseForm companyId={companyId} onSave={refresh} onClose={() => setSheet(null)} />
        </Sheet>
      )}
      {sheet === 'invoice' && (
        <Sheet title="Generate Invoice" onClose={() => setSheet(null)}>
          <InvoiceForm companyId={companyId} contracts={contracts} onSave={refresh} onClose={() => setSheet(null)} />
        </Sheet>
      )}
    </div>
  )
}
