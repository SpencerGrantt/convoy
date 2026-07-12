import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOCK_OPPORTUNITIES = [
  {
    title: 'Government Owned Contractor Operated Fuel Storage Facility at DFSP Tampa, FL',
    score: 8,
    reason: 'Direct match: DLA Energy GOCO facility opportunity',
    deadline: '2026-07-23',
    link: 'https://sam.gov',
    noticeId: null,
    solicitationNumber: 'SPE60326R0518',
    naicsCode: '492110',
    agency: 'Defense Logistics Agency',
    department: 'DEPT OF DEFENSE',
    subtier: 'DEFENSE LOGISTICS AGENCY',
    office: 'DLA ENERGY',
    noticeType: 'Updated Solicitation',
    offersDue: '2026-07-23T14:00:00-04:00',
    publishedDate: '2026-07-01',
    state: 'FL',
  },
  {
    title: 'Medical Specimen Transport — VA Medical Center',
    score: 8,
    reason: 'Direct match: VA medical logistics with SDVOSB set-aside',
    deadline: '2026-07-15',
    link: 'https://sam.gov',
    noticeId: null,
    solicitationNumber: null,
    naicsCode: '492110',
    agency: 'Department of Veterans Affairs',
    department: 'VETERANS AFFAIRS, DEPARTMENT OF',
    subtier: null,
    office: null,
    noticeType: 'Solicitation',
    offersDue: null,
    publishedDate: null,
    state: null,
  },
  {
    title: 'Lab Courier Services — HHS Region 3',
    score: 7,
    reason: 'Strong fit: HHS lab courier aligns with NAICS 492110',
    deadline: '2026-07-30',
    link: 'https://sam.gov',
    noticeId: null,
    solicitationNumber: null,
    naicsCode: '492110',
    agency: 'Department of Health and Human Services',
    department: 'HEALTH AND HUMAN SERVICES, DEPARTMENT OF',
    subtier: null,
    office: null,
    noticeType: 'Solicitation',
    offersDue: null,
    publishedDate: null,
    state: null,
  },
  {
    title: 'DoD Medical Supply Delivery — SDVOSB Set-Aside',
    score: 6,
    reason: 'Good fit: SDVOSB set-aside for medical supply delivery',
    deadline: '2026-08-01',
    link: 'https://sam.gov',
    noticeId: null,
    solicitationNumber: null,
    naicsCode: '621610',
    agency: 'Department of Defense',
    department: 'DEPT OF DEFENSE',
    subtier: null,
    office: null,
    noticeType: 'Solicitation',
    offersDue: null,
    publishedDate: null,
    state: null,
  },
]

// Best-effort fallback for opportunities whose place-of-performance state
// isn't populated in the SAM.gov response — a lot of listings put it in
// the title instead (e.g. "... at DFSP Tampa, FL").
function guessStateFromTitle(title?: string | null): string | null {
  const m = /,\s*([A-Z]{2})\b/.exec(title ?? '')
  return m ? m[1] : null
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
    const { naicsCodes, title } = await req.json()
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
        // Manual keyword search — matches against opportunity title
        if (title?.trim()) {
          params.set('title', title.trim())
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
              noticeId: opp.noticeId ?? null,
              solicitationNumber: opp.solicitationNumber ?? null,
              naicsCode: opp.naicsCode ?? null,
              agency: opp.fullParentPathName?.split('.').pop()?.trim() ?? opp.department ?? null,
              department: opp.department ?? null,
              subtier: opp.subTier ?? null,
              office: opp.office ?? null,
              noticeType: opp.type ?? null,
              // Only carry the raw deadline through as a date value if it
              // actually parses — SAM.gov's field isn't guaranteed strict
              // ISO 8601 for every notice type, and a bad string here would
              // otherwise reach the client and blow up date formatting.
              offersDue: opp.responseDeadLine && !isNaN(Date.parse(opp.responseDeadLine))
                ? opp.responseDeadLine
                : null,
              publishedDate: opp.postedDate && !isNaN(Date.parse(opp.postedDate))
                ? opp.postedDate
                : null,
              state: opp.placeOfPerformance?.state?.code
                ?? opp.officeAddress?.state?.code
                ?? guessStateFromTitle(opp.title)
                ?? null,
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
