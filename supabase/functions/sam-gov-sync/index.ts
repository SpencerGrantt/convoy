import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hardcoded dates here used to go stale the moment they passed — a fallback
// shown as "sample results" still shouldn't display deadlines already in
// the past. Compute them relative to today instead, every time.
function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function mockOpportunities() {
  return [
    {
      title: 'Medical Specimen Transport: VA Medical Center',
      score: 8,
      reason: 'Direct match: VA medical logistics with SDVOSB set-aside',
      deadline: daysFromNow(21),
      link: 'https://sam.gov',
      noticeId: null,
      naicsCode: '492110',
      agency: 'Department of Veterans Affairs',
      placeOfPerformance: null,
    },
    {
      title: 'Lab Courier Services: HHS Region 3',
      score: 7,
      reason: 'Strong fit: HHS lab courier aligns with NAICS 492110',
      deadline: daysFromNow(35),
      link: 'https://sam.gov',
      noticeId: null,
      naicsCode: '492110',
      agency: 'Department of Health and Human Services',
      placeOfPerformance: null,
    },
    {
      title: 'DoD Medical Supply Delivery: SDVOSB Set-Aside',
      score: 6,
      reason: 'Good fit: SDVOSB set-aside for medical supply delivery',
      deadline: daysFromNow(45),
      link: 'https://sam.gov',
      noticeId: null,
      naicsCode: '621610',
      agency: 'Department of Defense',
      placeOfPerformance: null,
    },
  ]
}

function mmddyyyy(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}/${day}/${d.getFullYear()}`
}

// AbortController is unreliable in Deno — use Promise.race with a timer
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ])
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // This had no authentication at all — SAM.gov opportunity data itself
    // is public, so it's not a data leak, but the API key behind it is a
    // scarce shared resource (~10 requests/day on a non-federal key, per
    // the pagination note below). An unauthenticated caller who found this
    // URL could exhaust the whole company's daily quota with no rate limit
    // of their own. Same fix already applied to ai-proxy for the same
    // reason — require a real session before spending it.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session, please sign out and back in' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { naicsCodes, title, state } = await req.json()
    const samApiKey = Deno.env.get('SAM_GOV_API_KEY')

    let opportunities = mockOpportunities()
    let live = false
    let debugReason = samApiKey ? null : 'no SAM_GOV_API_KEY secret set'

    if (samApiKey) {
      try {
        const today = new Date()
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(today.getDate() - 90)

        // Fetch a larger batch than the UI shows up front (25 vs. 5) in
        // this ONE call — "see more" reveals from what's already fetched
        // instead of firing a second API request. SAM.gov public-API keys
        // are rate-limited to roughly 10 requests/day for non-federal
        // accounts, so every extra call is expensive; a bigger single fetch
        // is the only way to support pagination without burning through it.
        const params = new URLSearchParams({
          api_key: samApiKey,
          limit: '25',
          postedFrom: mmddyyyy(ninetyDaysAgo),
          postedTo: mmddyyyy(today),
          active: 'Yes',
        })

        // The documented param is "ncode", not "naicsCode" — the latter is
        // silently ignored by SAM.gov (no error, just an unfiltered result
        // set), which is exactly what was happening here: every search
        // returned live, real, but completely NAICS-irrelevant opportunities.
        if (naicsCodes?.[0]) {
          params.set('ncode', String(naicsCodes[0]).trim())
        }
        // Manual keyword search — matches against opportunity title
        if (title?.trim()) {
          params.set('title', title.trim())
        }
        // Place-of-performance state, e.g. "TX" — optional
        if (state?.trim()) {
          params.set('state', state.trim().toUpperCase())
        }

        const samUrl = `https://api.sam.gov/opportunities/v2/search?${params}`
        console.log('[sam-gov-sync] fetching:', samUrl.replace(samApiKey, '***'))

        // 12s timeout — SAM.gov is slow; fail fast to mock rather than hang
        const samRes = await withTimeout(fetch(samUrl), 12000)

        if (!samRes) {
          debugReason = 'request timed out after 12s (likely blocked at network level, not a SAM.gov error response)'
          console.log('[sam-gov-sync]', debugReason)
        } else if (!samRes.ok) {
          const body = await samRes.text().catch(() => '')
          debugReason = `SAM.gov returned HTTP ${samRes.status}: ${body.slice(0, 200)}`
          console.log('[sam-gov-sync]', debugReason)
        } else {
          const samData = await samRes.json()
          const raw: any[] = samData.opportunitiesData ?? []
          console.log('[sam-gov-sync] got', raw.length, 'results')
          if (raw.length) {
            live = true
            opportunities = raw.map((opp, i) => ({
              title: opp.title ?? 'Untitled Opportunity',
              score: Math.max(6, 8 - i),
              reason: [
                opp.typeOfSetAsideDescription,
                opp.naicsCode ? `NAICS ${opp.naicsCode}` : null,
                opp.baseType,
              ].filter(Boolean).join(', ') || 'Government opportunity',
              deadline: opp.responseDeadLine ?? opp.archiveDate ?? 'See SAM.gov',
              link: opp.uiLink ?? `https://sam.gov/opp/${opp.noticeId}/view`,
              noticeId: opp.noticeId ?? null,
              naicsCode: opp.naicsCode ?? null,
              agency: opp.fullParentPathName?.split('.').pop()?.trim() ?? opp.department ?? null,
              placeOfPerformance: [
                opp.placeOfPerformance?.city?.name,
                opp.placeOfPerformance?.state?.code,
              ].filter(Boolean).join(', ') || null,
            }))
          } else {
            debugReason = 'SAM.gov responded OK but returned zero opportunitiesData rows for this NAICS/date range'
          }
        }
      } catch (fetchErr: any) {
        debugReason = `fetch threw: ${fetchErr.message}`
        console.log('[sam-gov-sync]', debugReason)
      }
    }

    return new Response(JSON.stringify({ opportunities, live, debugReason }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ opportunities: mockOpportunities(), error: err.message }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
})
