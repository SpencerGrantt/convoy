import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Placeholder — SAM.gov solicitation sync (Week 3)
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  return new Response(JSON.stringify({ message: 'SAM.gov sync coming in Week 3' }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
