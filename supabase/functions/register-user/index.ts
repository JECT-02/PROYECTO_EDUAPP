// supabase/functions/register-user/index.ts
// Crea un usuario con email_confirm=true (simulando la verificación por correo).
// Usado por el frontend en lugar de supabase.auth.signUp() para evitar la dependencia
// del envío de correo real. Bypasea el ciclo de confirmación.
//
// NOTA: en producción, esto debería reemplazarse por signUp() + verificación real.

import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabase-admin.ts'

interface RegisterPayload {
  email: string
  password: string
  fullName: string
  role: 'student' | 'teacher' | 'parent'
  ageBand?: string
  institution?: string
  subject?: string
  relation?: string
  dni?: string
  accessibility?: Record<string, unknown>
  avatar_id?: number
  pet_type?: string
  pet_name?: string
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as RegisterPayload
    if (!body.email || !body.password || !body.fullName || !body.role) {
      return jsonError(400, 'Faltan campos: email, password, fullName, role')
    }
    if (body.password.length < 6) {
      return jsonError(400, 'La contraseña debe tener al menos 6 caracteres')
    }

    const admin = getAdminClient()
    // 1) Verificar si ya existe
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
    const existing = list?.users?.find((u) => u.email === body.email)
    if (existing) {
      return jsonError(409, 'Ya existe una cuenta con ese correo.')
    }

    // 2) Crear usuario con email_confirm=true (simulación de verificación)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        role: body.role,
        dni: body.dni,
        age_band: body.ageBand,
        institution: body.institution,
        subject: body.subject,
        relation: body.relation,
        avatar_id: body.avatar_id,
        pet_type: body.pet_type,
        pet_name: body.pet_name,
      },
    })
    if (cErr) throw cErr
    const userId = created.user.id

    // 3) Crear/actualizar perfil (puede que el trigger ya lo haya creado)
    const profile = {
      id: userId,
      role: body.role,
      full_name: body.fullName,
      email: body.email,
      age_band: body.ageBand,
      institution: body.institution,
      institution_short: body.institution,
      subject: body.role === 'teacher' ? body.subject : undefined,
      relation: body.role === 'parent' ? body.relation : undefined,
      avatar_id: body.avatar_id,
      pet_type: body.pet_type,
      pet_name: body.pet_name,
      dni: body.dni,
      password: body.password, // DEMO ONLY: texto plano
      accessibility_settings: body.accessibility ?? {},
      onboarding_completed: false,
    }
    const { error: pErr } = await admin.from('profiles').upsert(profile, { onConflict: 'id' })
    if (pErr) console.error('profile upsert error:', pErr.message)

    return jsonOk({
      user: { id: userId, email: body.email },
      needsConfirmation: false,
      simulated: true,
    })
  } catch (e) {
    console.error(e)
    return jsonError(500, e?.message || 'internal error')
  }
})

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
