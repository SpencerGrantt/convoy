import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // Service role client — bypasses RLS so an owner can manage other members' rows
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

    const { action, target_id, role } = await req.json()

    const { data: caller, error: callerErr } = await admin
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', user.id)
      .single()
    if (callerErr || !caller) throw new Error('Caller profile not found')

    if (caller.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only an owner can manage team members' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }
    if (!target_id || target_id === caller.id) {
      return new Response(JSON.stringify({ error: 'You cannot perform this action on your own account' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { data: target, error: targetErr } = await admin
      .from('profiles')
      .select('id, company_id')
      .eq('id', target_id)
      .single()
    if (targetErr || !target || target.company_id !== caller.company_id) {
      return new Response(JSON.stringify({ error: 'Team member not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    if (action === 'update_role') {
      if (!['owner', 'dispatcher', 'driver'].includes(role)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }
      const { error } = await admin.from('profiles').update({ role }).eq('id', target_id)
      if (error) throw new Error(error.message)
    } else if (action === 'remove') {
      // Unlink from the company rather than deleting the auth user — preserves
      // historical runs/custody records that reference this profile.
      const { error } = await admin
        .from('profiles')
        .update({ company_id: null, onboarding_complete: false })
        .eq('id', target_id)
      if (error) throw new Error(error.message)
    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
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
