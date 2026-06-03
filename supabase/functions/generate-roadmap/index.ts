// supabase/functions/generate-roadmap/index.ts
// Generate roadmap JSON for a course and insert nodes
// Reglas aplicadas: ver .agents/roadmap-regulation/SKILL.md
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm } from '../_shared/llm.ts'
import { ROADMAP_SYSTEM } from '../_shared/prompts/roadmap.ts'

type GenNode = { title: string; type: string; description: string; position: number }
const ALLOWED_TYPES = new Set(['theory', 'practice', 'quiz', 'boss', 'reward'])

function enforceRegulation(nodes: GenNode[]): GenNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes
  // Sort by position
  const sorted = [...nodes].sort((a, b) => (a.position || 0) - (b.position || 0))
  // Sanitize types
  for (const n of sorted) {
    if (!ALLOWED_TYPES.has(n.type)) n.type = 'theory'
  }
  // 1) Asegurar primer nodo = theory
  if (sorted[0].type !== 'theory') {
    sorted[0] = { ...sorted[0], type: 'theory', title: sorted[0].title || 'Bienvenida' }
  }
  // 2) Asegurar un boss al final
  const lastIdx = sorted.length - 1
  if (sorted[lastIdx].type !== 'boss') {
    sorted.push({
      title: 'Examen final',
      type: 'boss',
      description: 'Desafío final integrador del curso.',
      position: lastIdx + 2,
    })
  } else {
    sorted[lastIdx].type = 'boss'
  }
  // 3) Regla: máximo 1 quiz cada 3 nodos
  let lastQuizPos = -10
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === 'quiz') {
      if (i - lastQuizPos < 3) {
        // demasiado cerca del quiz anterior -> convertir a practice
        sorted[i] = { ...sorted[i], type: 'practice' }
      } else {
        lastQuizPos = i
      }
    }
  }
  // 4) Recalcular positions
  return sorted.map((n, i) => ({ ...n, position: i + 1 }))
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { courseId, level = 3, rigor = 3 } = await req.json()
    if (!courseId) return jsonError(400, 'courseId required')

    const admin = getAdminClient()
    const { data: course } = await admin.from('courses').select('*').eq('id', courseId).single()
    if (!course) return jsonError(404, 'course not found')

    const userMsg = `Curso: ${course.title}\nDescripción: ${course.description}\nCategoría: ${course.category || 'general'}\nNivel del curso: ${level}/5, rigor: ${rigor}/5.\n\nGenera entre 8 y 15 nodos respetando la regla: MÁXIMO 1 quiz cada 3 nodos no-quiz. Incluye un nodo "boss" al final. El primer nodo debe ser "theory" de bienvenida.`

    const llmRes = await callLlm({
      system: ROADMAP_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.6,
      maxOutputTokens: 3000,
      json: true,
    })
    if (!llmRes.ok) return jsonError(500, 'LLM error')
    const llmJson = await llmRes.json()
    const text = llmJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: { nodes?: GenNode[] } = {}
    try { parsed = JSON.parse(text) } catch { parsed = {} }

    const generated = enforceRegulation(parsed.nodes ?? [])
    if (generated.length === 0) return jsonError(500, 'No nodes generated')

    // Replace existing nodes for this course
    await admin.from('nodes').delete().eq('course_id', courseId)
    const rows = generated.map((n) => ({
      course_id: courseId,
      title: String(n.title || '').slice(0, 120),
      type: ALLOWED_TYPES.has(n.type) ? n.type : 'theory',
      description: String(n.description || '').slice(0, 300),
      position: n.position,
      status: 'pending_review',
    }))
    const { data: inserted, error: insErr } = await admin.from('nodes').insert(rows).select()
    if (insErr) return jsonError(500, insErr.message)
    return jsonOk({ nodes: inserted, count: inserted?.length || 0, regulation_applied: true })
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
