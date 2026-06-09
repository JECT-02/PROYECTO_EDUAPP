// supabase/functions/chat-roadmap/index.ts
// AI assistant for teacher to refine roadmap via chat
import { corsHeaders } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm, extractLlmText } from '../_shared/llm.ts'

const ALLOWED_TYPES = ['theory', 'practice', 'quiz', 'boss', 'reward']

Deno.serve(async (req) => {
  // Handle CORS preflight FIRST, before touching the body
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // read body FIRST, before any headers/auth operations
  let reqBody: Record<string, unknown> = {}
  try {
    reqBody = JSON.parse(await req.text())
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const token = getAccessToken(req)
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { courseId, message, nodes, history } = reqBody
    if (!courseId || !message) return new Response('Bad request', { status: 400, headers: corsHeaders })

    console.log(`[chat-roadmap] courseId=${courseId} message="${message.slice(0, 80)}..." nodes=${(nodes ?? []).length}`)

    const admin = getAdminClient()
    const { data: course } = await admin.from('courses').select('*').eq('id', courseId).single()
    if (!course) return new Response('Course not found', { status: 404, headers: corsHeaders })

    const roadmapSummary = (nodes ?? []).map((n: { position?: number; type?: string; title?: string }) =>
      `  ${n.position ?? '?'}. [${n.type ?? 'theory'}] ${n.title ?? 'Sin titulo'}`
    ).join('\n')

    const currentRoadmapBlock = roadmapSummary
      ? `Roadmap actual del curso:\n${roadmapSummary}`
      : '(El roadmap aun no tiene nodos)'

    const historyBlock = (history ?? []).map((m: { role: string; text: string }) =>
      `${m.role === 'user' ? 'Profesor' : 'Asistente'}: ${m.text}`
    ).join('\n')

    const conversationHistory = historyBlock ? `\n\nHistorial de la conversacion:\n${historyBlock}` : ''

    const system = `Eres un asistente que ayuda al profesor a disenar y refinar el roadmap (mapa de aprendizaje) de su curso.
Tienes acceso al roadmap actual del curso con sus nodos.

Tipos de nodo disponibles:
- theory: contenido teorico/leccion
- practice: ejercicio practico
- quiz: evaluacion corta
- boss: examen final/desafio
- reward: recompensa

Reglas del roadmap:
- El primer nodo SIEMPRE debe ser "theory"
- El ultimo nodo SIEMPRE debe ser "boss"
- Maximo 1 quiz cada 3 nodos que no sean quiz
- Debe haber entre 8 y 15 nodos

Cuando el profesor te pida cambios, RESPONDE UNICAMENTE con un JSON valido en este formato:
{
  "mensaje": "tu explicacion para el profesor",
  "cambios": [
    { "accion": "agregar", "posicion": 3, "tipo": "quiz", "titulo": "titulo", "descripcion": "descripcion" },
    { "accion": "eliminar", "posicion": 5 },
    { "accion": "mover", "posicion": 7, "nueva_posicion": 2 },
    { "accion": "cambiar_tipo", "posicion": 4, "nuevo_tipo": "practice" },
    { "accion": "renombrar", "posicion": 2, "nuevo_titulo": "Nuevo titulo", "nueva_descripcion": "nueva descripcion" }
  ]
}

El array "cambios" puede estar vacio si solo responde una pregunta sin sugerir cambios.
El campo "mensaje" es obligatorio siempre.

IMPORTANTE: Las posiciones en "cambios" se refieren a la posicion ACTUAL del nodo (no cambian con cada operacion).`;

    const userMsg = `${currentRoadmapBlock}${conversationHistory}\n\nMensaje del profesor: ${message}

Recuerda responder SOLO con el JSON especificado.`

    const llmRes = await callLlm({
      system,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.7,
      maxOutputTokens: 2048,
      json: true,
    })
    if (!llmRes.ok) {
      const err = await llmRes.text().catch(() => 'unknown')
      console.error('[chat-roadmap] LLM error:', llmRes.status, err.slice(0, 300))
      return new Response(JSON.stringify({ error: 'Error del asistente IA: ' + err.slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const llmJson = await llmRes.json()
    const text = extractLlmText(llmJson) || '{}'
    console.log('[chat-roadmap] respuesta IA:', text.slice(0, 200))

    let parsed: { mensaje?: string; cambios?: Array<{ accion: string; posicion: number; tipo?: string; titulo?: string; descripcion?: string; nueva_posicion?: number; nuevo_tipo?: string; nuevo_titulo?: string; nueva_descripcion?: string }> } = {}
    try { parsed = JSON.parse(text) } catch {
      console.warn('[chat-roadmap] no se pudo parsear JSON, devolviendo texto como mensaje')
    }

    return new Response(JSON.stringify({
      mensaje: parsed.mensaje || text || 'Procesando...',
      cambios: parsed.cambios || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[chat-roadmap] error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Error interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
