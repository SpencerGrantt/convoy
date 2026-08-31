import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { id } = await req.json()
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetched server-side by id rather than trusting the request body for
    // the email content — this endpoint takes no auth (anon visitors submit
    // the public demo form), so anything caller-supplied here could be used
    // to relay arbitrary text into the notification email.
    const { data: demoRequest, error: fetchErr } = await admin
      .from('demo_requests')
      .select('name, email, company, message, created_at')
      .eq('id', id)
      .single()
    if (fetchErr || !demoRequest) {
      return new Response(JSON.stringify({ error: 'Demo request not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { name, email, company, message } = demoRequest

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vantar <onboarding@resend.dev>',
        to: [Deno.env.get('DEMO_NOTIFY_EMAIL')!],
        reply_to: email,
        subject: `New demo request: ${name}${company ? ` (${company})` : ''}`,
        html: `
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
          <p><strong>Message:</strong><br>${escapeHtml(message ?? '').replace(/\n/g, '<br>')}</p>
        `,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Resend error: ${res.status} ${detail}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
