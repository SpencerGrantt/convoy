import { createClient, processLock } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Demo mode — expected in local dev without .env.local
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      // Default auth uses navigator.locks (Web Locks API) to coordinate
      // session refresh across tabs. If a tab dies/crashes mid-refresh, the
      // browser can leave that lock permanently held for the whole profile —
      // every future tab/reload then hangs forever waiting on it (only a full
      // browser restart clears it), which silently strands the user with no
      // profile loaded. processLock keeps the same coordination in-memory
      // per tab instead, so a dead tab can never orphan a lock for others.
      lock: processLock,
    },
  }
)

// supabase.functions.invoke() has no built-in timeout — if the target
// function's compute is cold/unresponsive the request can hang forever,
// leaving the UI stuck on a spinner with no error to react to. Wrap every
// call with an AbortSignal so it fails loudly instead.
export async function invokeFn(name, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const result = await supabase.functions.invoke(name, { ...options, signal: controller.signal })
    // On a non-2xx response, supabase-js resolves `error` to a generic
    // FunctionsHttpError ("Edge Function returned a non-2xx status code")
    // rather than the specific reason our functions actually threw (e.g.
    // "User already registered", "Only an owner or dispatcher can invite
    // team members") — that real message is left sitting in the unread
    // response body on `result.response`. Every caller across the app reads
    // `error.message` directly, so they were all showing the same useless
    // generic text; parse the real one here once instead of in each caller.
    if (result.error && result.response) {
      try {
        const body = await result.response.clone().json()
        if (body?.error) result.error = new Error(body.error)
      } catch {
        // Body wasn't JSON, or already consumed — keep the generic message.
      }
    }
    return result
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { data: null, error: new Error(`Request to "${name}" timed out — please try again`) }
    }
    return { data: null, error: err }
  } finally {
    clearTimeout(timer)
  }
}
