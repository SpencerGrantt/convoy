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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { naicsCodes, companyName } = await req.json()
    const samApiKey = Deno.env.get('SAM_GOV_API_KEY')

    let opportunities = MOCK_OPPORTUNITIES

    // If a real SAM.gov API key is configured, fetch live results
    if (samApiKey) {
      try {
        const naicsParam = (naicsCodes ?? []).join(',')
        const samUrl = `https://api.sam.gov/prod/opportunities/v2/search?limit=10&api_key=${samApiKey}&naicsCodes=${naicsParam}&typeOfSetAside=SDVOSBC&active=true`

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)

        const samRes = await fetch(samUrl, { signal: controller.signal })
        clearTimeout(timer)

        if (samRes.ok) {
          const samData = await samRes.json()
          const raw = samData.opportunitiesData ?? []
          if (raw.length) {
            opportunities = raw.slice(0, 3).map((opp: any, i: number) => ({
              title: opp.title ?? 'Untitled Opportunity',
              score: 8 - i,
              reason: `NAICS ${opp.naicsCode ?? 'match'} — ${opp.baseType ?? 'Solicitation'}`,
              deadline: opp.responseDeadline ?? opp.deadline ?? 'See SAM.gov',
              link: opp.uiLink ?? 'https://sam.gov',
            }))
          }
        }
      } catch {
        // SAM.gov timed out or errored — use mock data
      }
    }

    return new Response(JSON.stringify({ opportunities }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ opportunities: MOCK_OPPORTUNITIES, error: err.message }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
})
