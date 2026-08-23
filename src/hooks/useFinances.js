import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, startOfYear, format } from 'date-fns'

// 'mtd' matches the pre-existing behavior (current calendar month); 'ytd'
// starts Jan 1 of the current year with no upper bound (today's entries are
// naturally the most recent, no need to bound the future); 'all' fetches
// every entry regardless of date, same as today's outstanding-invoices
// query already does.
function periodRange(period) {
  const now = new Date()
  if (period === 'ytd') return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: null }
  if (period === 'all') return { start: null, end: null }
  return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') }
}

export function useFinances(period = 'mtd') {
  const [revenue, setRevenue] = useState([])
  const [expenses, setExpenses] = useState([])
  const [invoices, setInvoices] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { start, end } = periodRange(period)

    let revQuery = supabase.from('revenue_entries').select('*').order('created_at', { ascending: false })
    let expQuery = supabase.from('expense_entries').select('*').order('created_at', { ascending: false })
    if (start) { revQuery = revQuery.gte('entry_date', start); expQuery = expQuery.gte('entry_date', start) }
    if (end)   { revQuery = revQuery.lte('entry_date', end);   expQuery = expQuery.lte('entry_date', end) }

    const [rev, exp, inv, con] = await Promise.all([
      revQuery,
      expQuery,
      supabase.from('invoices').select('*, contracts(name)').order('created_at', { ascending: false }),
      supabase.from('contracts').select('id, name').eq('status', 'active'),
    ])

    setRevenue(rev.data ?? [])
    setExpenses(exp.data ?? [])
    setInvoices(inv.data ?? [])
    setContracts(con.data ?? [])
    setLoading(false)
  }, [period])

  useEffect(() => { fetch() }, [fetch])

  const totalRevenue  = revenue.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit     = totalRevenue - totalExpenses
  const outstanding   = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.total_amount ?? 0), 0)

  return { revenue, expenses, invoices, contracts, loading, totalRevenue, totalExpenses, netProfit, outstanding, refresh: fetch }
}
