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

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-navy-700 rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-h-[85vh] overflow-y-auto border-t border-white/[0.08]">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-white">{title}</p>
          <button onClick={onClose} className="text-white/40 text-2xl leading-none">×</button>
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

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-white/50 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Lab specimen courier" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Contract</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={fieldClass}>
          <option value="">None</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
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

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-white/50 mb-1">Category *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={fieldClass}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Gas — Van 01" className={fieldClass} />
      </div>
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
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
  const [err, setErr] = useState('')

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

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-white/50 mb-1">Contract *</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={fieldClass}>
          <option value="">Select contract</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-white/50 mb-1">Period Start</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Period End</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <button onClick={fetchRuns} className="w-full bg-white/10 text-white/80 font-semibold py-2.5 rounded-xl text-sm">
        Load Completed Runs
      </button>
      {fetched && (
        <div className="bg-navy-800 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-white/50">{runs.length} runs found</p>
          {runs.map(r => (
            <div key={r.id} className="flex justify-between text-xs text-white/60">
              <span className="truncate flex-1">{r.dropoff_address}</span>
              <span className="shrink-0 ml-2">{fmt(r.revenue_entries?.[0]?.amount ?? 0)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-1 flex justify-between text-sm font-bold text-white">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>
      )}
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
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
  const [sheet, setSheet] = useState(null)
  const companyId = profile?.company_id

  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})
  const chartData = Object.entries(expenseByCategory).map(([name, amount]) => ({ name, amount }))

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Finances" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Revenue MTD"  value={fmt(totalRevenue)}  color="green"  />
          <MetricCard label="Expenses MTD" value={fmt(totalExpenses)} color="yellow" />
          <MetricCard label="Net Profit"   value={fmt(netProfit)}     color={netProfit >= 0 ? 'green' : 'red'} />
          <MetricCard label="Outstanding"  value={fmt(outstanding)}   color="red"    />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setSheet('revenue')} className="bg-green-500/20 text-green-300 font-semibold py-2.5 rounded-xl text-xs active:bg-green-500/30">+ Revenue</button>
          <button onClick={() => setSheet('expense')} className="bg-yellow-500/20 text-yellow-300 font-semibold py-2.5 rounded-xl text-xs active:bg-yellow-500/30">+ Expense</button>
          <button onClick={() => setSheet('invoice')} className="bg-brand-500/20 text-brand-300 font-semibold py-2.5 rounded-xl text-xs active:bg-brand-500/30">+ Invoice</button>
        </div>

        {chartData.length > 0 && (
          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07]">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Expenses by Category</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                <Tooltip
                  formatter={v => fmt(v)}
                  contentStyle={{ background: '#1A0B47', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                />
                <Bar dataKey="amount" fill="#3393E8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Recent Revenue</p>
          {revenue.length === 0 && <p className="text-sm text-white/40 text-center py-2">No entries this month</p>}
          {revenue.slice(0, 5).map(r => (
            <div key={r.id} className="bg-navy-700 rounded-xl px-4 py-3 border border-white/[0.07] flex items-center justify-between mb-2">
              <p className="text-sm text-white/80 truncate flex-1">{r.description || 'Revenue entry'}</p>
              <p className="text-sm font-bold text-green-400 ml-3">{fmt(r.amount)}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Recent Expenses</p>
          {expenses.length === 0 && <p className="text-sm text-white/40 text-center py-2">No entries this month</p>}
          {expenses.slice(0, 5).map(e => (
            <div key={e.id} className="bg-navy-700 rounded-xl px-4 py-3 border border-white/[0.07] flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white/80">{e.description || e.category.replace('_', ' ')}</p>
                <p className="text-xs text-white/40 capitalize">{e.category.replace('_', ' ')}</p>
              </div>
              <p className="text-sm font-bold text-red-400 ml-3">{fmt(e.amount)}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Invoices</p>
          {invoices.length === 0 && <p className="text-sm text-white/40 text-center py-2">No invoices yet</p>}
          {invoices.map(inv => (
            <div key={inv.id} className="bg-navy-700 rounded-xl p-4 border border-white/[0.07] flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-white">#{inv.invoice_number ?? inv.id.slice(0, 8)}</p>
                <p className="text-xs text-white/50">{inv.contracts?.name ?? '—'}</p>
                {inv.period_start && (
                  <p className="text-xs text-white/40">{format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{fmt(inv.total_amount ?? 0)}</p>
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
