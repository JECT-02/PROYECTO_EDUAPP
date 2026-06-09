// supabase/functions/generate-coliseo/index.ts
// Generate a final boss battle (coliseo) test
import { corsHeaders } from '../_shared/cors.ts'
import { getAccessToken, getUserClient, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm, extractLlmText } from '../_shared/llm.ts'
import { QUIZ_SYSTEM } from '../_shared/prompts/quiz.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // read body FIRST, before any headers/auth operations
  let reqBody: Record<string, unknown> = {}
  try {
    reqBody = JSON.parse(await req.text())
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { courseId, count = 10, level = 5 } = reqBody
    if (!courseId) return jsonError(400, 'courseId required')

    const admin = getAdminClient()
    const { data: course } = await admin.from('courses').select('title,description').eq('id', courseId).single()
    const { data: nodes } = await admin.from('nodes').select('title').eq('course_id', courseId).order('position')
    const syllabus = (nodes ?? []).map((n: { title: string }) => n.title).join('; ')

    const userMsg = `Examen final del curso "${course?.title}":\n${course?.description}\n\nTemario completo: ${syllabus}\n\nGenera ${count} preguntas difíciles nivel ${level}/5. Devuelve SOLO el JSON.`

    const llmRes = await callLlm({
      system: QUIZ_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.6,
      maxOutputTokens: 4000,
      json: true,
    })
    if (!llmRes.ok) return jsonError(500, 'LLM error')
    const llmJson = await llmRes.json()
    const text = extractLlmText(llmJson) || '{}'
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
