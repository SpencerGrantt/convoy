import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Demo mode — expected in local dev without .env.local
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key'
)

// supabase.functions.invoke() has no built-in timeout — if the target
// function's compute is cold/unresponsive the request can hang forever,
// leaving the UI stuck on a spinner with no error to react to. Wrap every
// call with an AbortSignal so it fails loudly instead.
export async function invokeFn(name, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await supabase.functions.invoke(name, { ...options, signal: controller.signal })
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { data: null, error: new Error(`Request to "${name}" timed out — please try again`) }
    }
    return { data: null, error: err }
  } finally {
    clearTimeout(timer)
  }
}
