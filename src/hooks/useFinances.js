import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export function useFinances() {
  const [revenue, setRevenue] = useState([])
  const [expenses, setExpenses] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd')

    Promise.all([
      supabase.from('revenue_entries').select('*').gte('entry_date', start).lte('entry_date', end),
      supabase.from('expense_entries').select('*').gte('entry_date', start).lte('entry_date', end),
      supabase.from('invoices').select('*, contracts(name)').order('created_at', { ascending: false }),
    ]).then(([rev, exp, inv]) => {
      setRevenue(rev.data ?? [])
      setExpenses(exp.data ?? [])
      setInvoices(inv.data ?? [])
      setLoading(false)
    })
  }, [])

  const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const netProfit = totalRevenue - totalExpenses
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0)

  return { revenue, expenses, invoices, loading, totalRevenue, totalExpenses, netProfit, outstanding }
}
