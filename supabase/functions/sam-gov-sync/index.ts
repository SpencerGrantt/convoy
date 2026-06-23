import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOCK_OPPORTUNITIES = [
  {
    title: 'Medical Specimen Transport — VA Medical Center',
    score: 8,
    reason: 'Direct match: VA medical logistics with SDVOSB set-aside',
    deadline: '2026-07-15',
    link: 'https://sam.gov',
  },
  {
    title: 'Lab Courier Services — HHS Region 3',
    score: 7,
    reason: 'Strong fit: HHS lab courier aligns with NAICS 492110',
    deadline: '2026-07-30',
    link: 'https://sam.gov',
  },
  {
    title: 'DoD Medical Supply Delivery — SDVOSB Set-Aside',
    score: 6,
    reason: 'Good fit: SDVOSB set-aside for medical supply delivery',
    deadline: '2026-08-01',
    link: 'https://sam.gov',
  },
]

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
    const { naicsCodes } = await req.json()
    const samApiKey = Deno.env.get('SAM_GOV_API_KEY')

    let opportunities = MOCK_OPPORTUNITIES
    let live = false

    if (samApiKey) {
      try {
        const today = new Date()
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(today.getDate() - 90)

        const params = new URLSearchParams({
          api_key: samApiKey,
          limit: '10',
          postedFrom: mmddyyyy(ninetyDaysAgo),
          postedTo: mmddyyyy(today),
          active: 'Yes',
        })

        // SAM.gov v2 accepts one naicsCode at a time
        if (naicsCodes?.[0]) {
          params.set('naicsCode', String(naicsCodes[0]).trim())
        }

        const samUrl = `https://api.sam.gov/opportunities/v2/search?${params}`
        console.log('[sam-gov-sync] fetching:', samUrl.replace(samApiKey, '***'))

        // 12s timeout — SAM.gov is slow; fail fast to mock rather than hang
        const samRes = await withTimeout(fetch(samUrl), 12000)

        if (!samRes) {
          console.log('[sam-gov-sync] timed out after 12s — likely AWS IP blocked by SAM.gov/Akamai')
        } else if (!samRes.ok) {
          const body = await samRes.text().catch(() => '')
          console.log('[sam-gov-sync] HTTP', samRes.status, body.slice(0, 200))
        } else {
          const samData = await samRes.json()
          const raw: any[] = samData.opportunitiesData ?? []
          console.log('[sam-gov-sync] got', raw.length, 'results')
          if (raw.length) {
            live = true
            opportunities = raw.slice(0, 5).map((opp, i) => ({
              title: opp.title ?? 'Untitled Opportunity',
              score: Math.max(6, 8 - i),
              reason: [
                opp.typeOfSetAsideDescription,
                opp.naicsCode ? `NAICS ${opp.naicsCode}` : null,
                opp.baseType,
              ].filter(Boolean).join(' — ') || 'Government opportunity',
              deadline: opp.responseDeadLine ?? opp.archiveDate ?? 'See SAM.gov',
              link: opp.uiLink ?? `https://sam.gov/opp/${opp.noticeId}/view`,
            }))
          }
        }
      } catch (fetchErr: any) {
        console.log('[sam-gov-sync] fetch error:', fetchErr.message)
      }
    }

    return new Response(JSON.stringify({ opportunities, live }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ opportunities: MOCK_OPPORTUNITIES, error: err.message }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
})
