import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env. ' +
    'La app funcionará solo con datos mock hasta que se completen.'
  )
}

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'eduapp_auth_token',
      },
    })
  : null

export async function requireSession() {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el .env.')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('No hay sesión activa. Inicia sesión.')
  return data.session
}

export async function getAccessToken() {
  const session = await requireSession()
  return session.access_token
}
