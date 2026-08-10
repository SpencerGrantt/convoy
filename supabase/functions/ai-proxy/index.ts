import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tool definitions handed to Claude — descriptions are what the model reads
// to decide *when* to call each one, so they're written for the model, not
// for a human reader. Every tool's actual execution (below) ignores
// whatever company-scoping the model might try to pass and always injects
// the authenticated caller's own company_id server-side instead — the
// model choosing filters (dates, status, category) is fine; the model
// choosing which company's data to see is never fine.
const TOOLS = [
  {
    name: 'query_runs',
    description: 'Look up the company\'s courier runs/trips, optionally filtered by status and/or date range. Use this whenever the user asks about specific runs, deliveries, or trip history rather than answering from memory.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'], description: 'Filter to runs in this status only.' },
        start_date: { type: 'string', description: 'ISO date (yyyy-mm-dd) — only runs scheduled on or after this date.' },
        end_date: { type: 'string', description: 'ISO date (yyyy-mm-dd) — only runs scheduled on or before this date.' },
        limit: { type: 'integer', description: 'Max rows to return, default 20, max 100.' },
      },
    },
  },
  {
    name: 'query_finances',
    description: 'Look up the company\'s actual revenue and/or expense entries, optionally filtered by date range and/or expense category. Use this whenever the user asks about real revenue, expenses, profit, or specific costs rather than answering from memory.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['revenue', 'expense', 'both'], description: 'Which entries to pull. Default both.' },
        start_date: { type: 'string', description: 'ISO date (yyyy-mm-dd) lower bound on entry_date.' },
        end_date: { type: 'string', description: 'ISO date (yyyy-mm-dd) upper bound on entry_date.' },
        category: { type: 'string', enum: ['fuel', 'driver_pay', 'insurance', 'maintenance', 'tolls', 'supplies', 'other'], description: 'Only for expense entries — filter to one category.' },
      },
    },
  },
  {
    name: 'query_contracts',
    description: 'Look up the company\'s federal contracts, optionally filtered by status or by how soon they expire. Use this for questions about contract status, upcoming renewals, or contract details rather than answering from memory.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'pending', 'expired', 'renewal'] },
        expiring_within_days: { type: 'integer', description: 'Only contracts whose end_date is within this many days from today.' },
      },
    },
  },
]

async function runTool(admin, companyId, name, input) {
  const clamp = (n, max) => Math.max(1, Math.min(Number(n) || max, max))

  if (name === 'query_runs') {
    let q = admin
      .from('runs')
      .select('id, pickup_address, dropoff_address, status, scheduled_at, picked_up_at, delivered_at, cargo_description, profiles(full_name), contracts(name)')
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: false })
      .limit(clamp(input?.limit, 100))
    if (input?.status) q = q.eq('status', input.status)
    if (input?.start_date) q = q.gte('scheduled_at', input.start_date)
    if (input?.end_date) q = q.lte('scheduled_at', input.end_date + 'T23:59:59')
    const { data, error } = await q
    if (error) return { error: error.message }
    return { runs: data }
  }

  if (name === 'query_finances') {
    const type = input?.type ?? 'both'
    const result = {}
    if (type === 'revenue' || type === 'both') {
      let q = admin.from('revenue_entries').select('amount, description, entry_date, contracts(name)').eq('company_id', companyId).order('entry_date', { ascending: false })
      if (input?.start_date) q = q.gte('entry_date', input.start_date)
      if (input?.end_date) q = q.lte('entry_date', input.end_date)
      const { data, error } = await q
      if (error) return { error: error.message }
      result.revenue_entries = data
      result.total_revenue = (data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    }
    if (type === 'expense' || type === 'both') {
      let q = admin.from('expense_entries').select('amount, category, description, entry_date').eq('company_id', companyId).order('entry_date', { ascending: false })
      if (input?.start_date) q = q.gte('entry_date', input.start_date)
      if (input?.end_date) q = q.lte('entry_date', input.end_date)
      if (input?.category) q = q.eq('category', input.category)
      const { data, error } = await q
      if (error) return { error: error.message }
      result.expense_entries = data
      result.total_expenses = (data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    }
    return result
  }

  if (name === 'query_contracts') {
    let q = admin.from('contracts').select('name, agency, contract_number, annual_value, start_date, end_date, status, naics_code').eq('company_id', companyId).order('end_date', { ascending: true })
    if (input?.status) q = q.eq('status', input.status)
    if (input?.expiring_within_days != null) {
      const cutoff = new Date(Date.now() + Number(input.expiring_within_days) * 86400000).toISOString().slice(0, 10)
      q = q.lte('end_date', cutoff)
    }
    const { data, error } = await q
    if (error) return { error: error.message }
    return { contracts: data }
  }

  return { error: `Unknown tool: ${name}` }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // This proxy previously had no authentication at all — anyone who found
    // the URL could spend this project's Anthropic budget on arbitrary
    // completions unrelated to Convoy. Now that it can also query real
    // company data via tools, an unauthenticated caller would be far worse
    // than a cost leak — it'd be an open door to every company's business
    // data. Require and verify a session before anything else.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: { user }, error: authErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session — please sign out and back in' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { data: caller, error: callerErr } = await admin
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single()
    if (callerErr || !caller?.company_id) {
      return new Response(JSON.stringify({ error: 'No company on this account' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { prompt, systemPrompt } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY secret not set' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    async function callClaude(messages) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          messages,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw { status: res.status, body: data }
      return data
    }

    // Agentic tool loop: Claude may ask for a tool, we run it against this
    // company's data only, feed the result back, and repeat until it
    // answers with plain text. Capped so a runaway loop (e.g. the model
    // repeatedly asking for the same tool) can't spin forever or blow the
    // request budget.
    const messages = [{ role: 'user', content: prompt }]
    let data = await callClaude(messages)

    for (let i = 0; i < 5 && data.stop_reason === 'tool_use'; i++) {
      messages.push({ role: 'assistant', content: data.content })
      const toolResults = []
      for (const block of data.content) {
        if (block.type !== 'tool_use') continue
        const result = await runTool(admin, caller.company_id, block.name, block.input)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      }
      messages.push({ role: 'user', content: toolResults })
      data = await callClaude(messages)
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    const status = err?.status ?? 500
    const body = err?.body ?? { error: err.message }
    return new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }
})
