import { corsHeaders } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { embedQuery } from '../_shared/embeddings.ts'
import { callLlm } from '../_shared/llm.ts'
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

    const { courseId, nodeId, count = 4, level = 3, rigor = 3 } = reqBody
    if (!courseId || !nodeId) return jsonError(400, 'courseId and nodeId required')

    const admin = getAdminClient()

    // Find node by UUID or position
    const isPos = !String(nodeId).includes('-')
    let node
    if (isPos) {
      const pos = parseInt(nodeId, 10)
      const { data: nodes } = await admin
        .from('nodes')
        .select('*')
        .eq('course_id', courseId)
        .eq('position', pos)
        .limit(1)
      node = nodes?.[0] || null
    } else {
      const { data: n } = await admin.from('nodes').select('*').eq('id', nodeId).single()
      node = n
    }
    if (!node) return jsonError(404, 'node not found')

    const qvec = await embedQuery(node.title)
    const { data: chunks } = await admin.rpc('match_documents', {
      query_embedding: qvec,
      match_course_id: courseId,
      match_count: 6,
    })
    const context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')
    const userMsg = context
      ? `Material:\n${context}\n\nGenera ${count} preguntas de opción múltiple sobre "${node.title}". Nivel ${level}/5, rigor ${rigor}/5. Devuelve SOLO el JSON.`
      : `Genera ${count} preguntas de opción múltiple sobre "${node.title}". Nivel ${level}/5, rigor ${rigor}/5. Devuelve SOLO el JSON.`

    const llmRes = await callLlm({
      system: QUIZ_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.5,
      maxOutputTokens: 2500,
      json: true,
    })
    if (!llmRes.ok) {
      const err = await llmRes.text().catch(() => 'unknown')
      console.error('[generate-quiz] LLM error:', llmRes.status, err.slice(0, 300))
      return jsonError(500, `LLM error: ${err.slice(0, 200)}`)
    }
    const llmJson = await llmRes.json()
    const text = llmJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: { questions?: unknown[] } = {}
    try { parsed = JSON.parse(text) } catch { parsed = {} }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : []

    // Save content as JSON string in the content field (same as generate-course-content)
    if (questions.length > 0) {
      await admin.from('nodes').update({
        content: JSON.stringify({ questions }),
        status: 'published',
      }).eq('id', node.id)
    }

    return jsonOk({ questions })
  } catch (e) {
    console.error('[generate-quiz] error:', e)
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
