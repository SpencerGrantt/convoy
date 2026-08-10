import { invokeFn } from './supabase'
import { format } from 'date-fns'

// Claude has no built-in clock — without this, "this month"/"last week"/
// "today" are pure guesswork against training data, not the actual current
// date. That's exactly what caused a real bug: asked for "this month"'s
// fuel expenses, it silently computed some other month as the date range
// and passed THAT to query_finances, which correctly filtered on the wrong
// dates it was given and (correctly) found nothing.
export function todayContext() {
  const now = new Date()
  return `Today's date is ${format(now, 'yyyy-MM-dd')} (${format(now, 'EEEE, MMMM d, yyyy')}). When the user asks about a relative time range (this month, last week, this quarter, year to date, etc.), compute the actual start/end dates from today's date above and pass them to the query tools as ISO dates (yyyy-MM-dd) — never guess or fall back to a training-data date.`
}

export function buildSystemPrompt(company, runs = [], contracts = []) {
  return `You are an AI assistant built into Convoy, a logistics app for ${company?.name ?? 'your company'},
a ${company?.sdvosb ? 'Service-Disabled Veteran-Owned (SDVOSB)' : 'veteran-owned'}
medical courier company.

${todayContext()}

Company details:
- CAGE code: ${company?.cage_code ?? 'N/A'}
- SAM.gov expiry: ${company?.sam_expiry ?? 'N/A'}
- NAICS codes: ${company?.naics_codes?.join(', ') ?? 'N/A'}
- Active contracts: ${contracts.map(c => c.name).join(', ') || 'None'}

Today's run summary:
- Total runs: ${runs.length}
- In transit: ${runs.filter(r => r.status === 'in_transit').length}
- Delivered: ${runs.filter(r => r.status === 'delivered').length}
- Pending: ${runs.filter(r => r.status === 'pending').length}

The summary above is just a quick snapshot — for anything specific (a date
range, a particular status, actual revenue/expense figures, contract
details), use the query_runs / query_finances / query_contracts tools to
pull the real data rather than guessing from the summary or estimating.

Answer questions about the business, flag compliance risks, suggest SAM.gov
contract opportunities based on NAICS codes, and help draft professional
communications. Be concise and practical.`
}

export async function askAI(prompt, systemPrompt) {
  // Longer than a single completion needs — a tool-use exchange means the
  // edge function makes several sequential Claude calls in one request (see
  // ai-proxy's tool loop), so the simple non-tool timeout budget is too
  // tight for a multi-step query.
  const { data, error } = await invokeFn('ai-proxy', {
    body: { prompt, systemPrompt },
  }, 45000)
  if (error) throw new Error(`Edge Function error: ${error.message}`)
  if (data?.error) throw new Error(`Anthropic error: ${JSON.stringify(data.error)}`)
  return data?.content?.[0]?.text ?? ''
}
