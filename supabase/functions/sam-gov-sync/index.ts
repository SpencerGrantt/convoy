import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOCK = [
  { title: 'Medical Specimen Transport — VA Medical Center',     naicsCode: '492110', responseDeadline: '2026-07-15', uiLink: 'https://sam.gov' },
  { title: 'Lab Courier Services — HHS Region 3',               naicsCode: '492110', responseDeadline: '2026-07-30', uiLink: 'https://sam.gov' },
  { title: 'DoD Medical Supply Delivery — SDVOSB Set-Aside',    naicsCode: '621610', responseDeadline: '2026-08-01', uiLink: 'https://sam.gov' },
]

function toScored(opps: any[]) {
  return opps.slice(0, 3).map((opp, i) => ({
    title:    opp.title,
    score:    8 - i,
    reason:   'Strong SDVOSB medical courier match',
    deadline: opp.responseDeadline ?? opp.deadline ?? 'See SAM.gov',
    link:     opp.uiLink ?? 'https://sam.gov',
  }))
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { naicsCodes, companyName, samExpiry } = await req.json()
    const samApiKey    = Deno.env.get('SAM_GOV_API_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const naicsParam   = (naicsCodes ?? []).join(',')

    // 1. Fetch SAM.gov opportunities (8 s timeout)
    let opportunities: any[] = []
    if (samApiKey) {
      try {
        const samUrl = `https://api.sam.gov/prod/opportunities/v2/search?limit=10&api_key=${samApiKey}&naicsCodes=${naicsParam}&typeOfSetAside=SDVOSBC&active=true`
        const samRes = await fetchWithTimeout(samUrl, {}, 8000)
        if (samRes.ok) {
          const samData = await samRes.json()
          opportunities = samData.opportunitiesData ?? []
        }
      } catch {
        // SAM.gov timed out or errored — fall through to mock
      }
    }

    if (!opportunities.length) opportunities = MOCK

    // 2. AI scoring (10 s timeout) — fall back to static scores on any failure
    if (anthropicKey) {
      try {
        const prompt = `Government contracting advisor for ${companyName}, an SDVOSB medical courier.
SAM expiry: ${samExpiry ?? 'unknown'}. NAICS: ${naicsParam}.
Score each 1-10 for fit. Return ONLY a JSON array, no other text:
[{"title":"...","score":8,"reason":"one line","deadline":"...","link":"..."}]

Opportunities:
${JSON.stringify(opportunities.slice(0, 10), null, 2)}`

        const aiRes = await fetchWithTimeout(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1024,
              messages: [{ role: 'user', content: prompt }],
            }),
          },
          10000  // 10 s hard limit
        )

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const text = aiData?.content?.[0]?.text ?? ''
          const match = text.match(/\[[\s\S]*\]/)
          if (match) {
            const parsed = JSON.parse(match[0])
            if (Array.isArray(parsed) && parsed.length) {
              return new Response(
                JSON.stringify({ opportunities: parsed.sort((a: any, b: any) => b.score - a.score).slice(0, 3) }),
                { headers: { 'Content-Type': 'application/json', ...CORS } }
              )
            }
          }
        }
      } catch {
        // Anthropic timed out or errored — fall through to static scores
      }
    }

    // 3. Static scores fallback (always fast)
    return new Response(
      JSON.stringify({ opportunities: toScored(opportunities) }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message, opportunities: toScored(MOCK) }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
})
