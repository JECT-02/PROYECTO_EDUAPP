// supabase/functions/generate-quiz/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { embedQuery } from '../_shared/embeddings.ts'
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

    const { courseId, nodeId, count = 4, level = 3, rigor = 3 } = await req.json()
    if (!courseId || !nodeId) return jsonError(400, 'courseId and nodeId required')

    const admin = getAdminClient()
    const { data: node } = await admin.from('nodes').select('*').eq('id', nodeId).single()
    if (!node) return jsonError(404, 'node not found')

    const qvec = await embedQuery(node.title)
    const { data: chunks } = await admin.rpc('match_documents', {
      query_embedding: qvec,
      match_course_id: courseId,
      match_count: 6,
    })
    const context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')
    const userMsg = `Material:\n${context || '(sin material, usa ' + node.title + ')'}\n\nGenera ${count} preguntas de opción múltiple sobre el nodo "${node.title}". Nivel de dificultad ${level}/5, rigor ${rigor}/5. Devuelve SOLO el JSON.`

    const llmRes = await callLlm({
      system: QUIZ_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.5,
      maxOutputTokens: 2500,
      json: true,
    })
    if (!llmRes.ok) {
      const err = await llmRes.text()
      return jsonError(500, `LLM error: ${err}`)
    }
    const llmJson = await llmRes.json()
    const text = llmJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: { questions?: unknown[] } = {}
    try { parsed = JSON.parse(text) } catch { parsed = {} }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    await admin.from('nodes').update({ quiz_data: { questions }, status: 'pending_review' }).eq('id', nodeId)
    return jsonOk({ questions })
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
