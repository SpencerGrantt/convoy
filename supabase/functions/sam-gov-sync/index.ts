import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { naicsCodes, companyName, samExpiry } = await req.json()
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const samApiKey   = Deno.env.get('SAM_GOV_API_KEY')

    // Fetch open solicitations from SAM.gov
    const naicsParam = (naicsCodes ?? []).join(',')
    const samUrl = `https://api.sam.gov/opportunities/v2/search?limit=10&api_key=${samApiKey}&naicsCodes=${naicsParam}&typeOfSetAside=SDB,SDVOSBC&active=true`

    let opportunities = []
    if (samApiKey) {
      const samRes = await fetch(samUrl)
      const samData = await samRes.json()
      opportunities = samData.opportunitiesData ?? []
    }

    // If no SAM key or no results, return mock data for demo
    if (!opportunities.length) {
      opportunities = [
        { title: 'Medical Specimen Transport — VA Medical Center', naicsCode: '492110', responseDeadline: '2026-07-15', baseType: 'Solicitation', uiLink: 'https://sam.gov' },
        { title: 'Lab Courier Services — HHS Region 3',           naicsCode: '492110', responseDeadline: '2026-07-30', baseType: 'Solicitation', uiLink: 'https://sam.gov' },
        { title: 'DoD Medical Supply Delivery — SDVOSB Set-Aside', naicsCode: '621610', responseDeadline: '2026-08-01', baseType: 'Solicitation', uiLink: 'https://sam.gov' },
      ]
    }

    // Score with Claude
    const prompt = `You are a government contracting advisor for ${companyName}, an SDVOSB medical courier company.
SAM.gov expiry: ${samExpiry ?? 'unknown'}. NAICS codes: ${naicsParam}.

Score each opportunity 1-10 for fit and provide a one-line reason. Return JSON array:
[{"title":"...","score":8,"reason":"...","deadline":"...","link":"..."}]

Opportunities:
${JSON.stringify(opportunities.slice(0, 10), null, 2)}`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await aiRes.json()
    const text = aiData.content?.[0]?.text ?? '[]'

    // Extract JSON from response
    const match = text.match(/\[[\s\S]*\]/)
    const scored = match ? JSON.parse(match[0]) : []

    return new Response(JSON.stringify({ opportunities: scored.sort((a: any, b: any) => b.score - a.score).slice(0, 3) }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, opportunities: [] }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
