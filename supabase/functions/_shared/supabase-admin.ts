// supabase/functions/_shared/supabase-admin.ts
// Supabase admin client using SERVICE_ROLE key
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

let _admin: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (_admin) return _admin
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _admin
}

export function getUserClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const auth = req.headers.get('Authorization') ?? ''
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getAccessToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}
