// supabase/functions/generate-test/index.ts
// Generate a full test (multiple nodes)
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm } from '../_shared/llm.ts'
import { QUIZ_SYSTEM } from '../_shared/prompts/quiz.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { courseId, count = 20, level = 4 } = await req.json()
    if (!courseId) return jsonError(400, 'courseId required')

    const admin = getAdminClient()
    const { data: course } = await admin.from('courses').select('title,description').eq('id', courseId).single()
    const { data: nodes } = await admin.from('nodes').select('title').eq('course_id', courseId).order('position')
    const syllabus = (nodes ?? []).map((n: { title: string }) => n.title).join('; ')

    const userMsg = `Curso: ${course?.title || ''}\nDescripción: ${course?.description || ''}\nTemario: ${syllabus}\n\nGenera un examen completo con ${count} preguntas de opción múltiple nivel ${level}/5. Devuelve SOLO el JSON.`

    const llmRes = await callLlm({
      system: QUIZ_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.5,
      maxOutputTokens: 4000,
      json: true,
    })
    if (!llmRes.ok) return jsonError(500, 'LLM error')
    const llmJson = await llmRes.json()
    const text = llmJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: { questions?: unknown[] } = {}
    try { parsed = JSON.parse(text) } catch { parsed = {} }
    return jsonOk({ questions: parsed.questions ?? [] })
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
