import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export function useFinances() {
  const [revenue, setRevenue] = useState([])
  const [expenses, setExpenses] = useState([])
  const [invoices, setInvoices] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const end   = format(endOfMonth(new Date()),   'yyyy-MM-dd')

    const [rev, exp, inv, con] = await Promise.all([
      supabase.from('revenue_entries').select('*').gte('entry_date', start).lte('entry_date', end).order('created_at', { ascending: false }),
      supabase.from('expense_entries').select('*').gte('entry_date', start).lte('entry_date', end).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, contracts(name)').order('created_at', { ascending: false }),
      supabase.from('contracts').select('id, name').eq('status', 'active'),
    ])

    setRevenue(rev.data ?? [])
    setExpenses(exp.data ?? [])
    setInvoices(inv.data ?? [])
    setContracts(con.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const totalRevenue  = revenue.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit     = totalRevenue - totalExpenses
  const outstanding   = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.total_amount ?? 0), 0)

  return { revenue, expenses, invoices, contracts, loading, totalRevenue, totalExpenses, netProfit, outstanding, refresh: fetch }
}
