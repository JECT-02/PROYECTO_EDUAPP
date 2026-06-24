import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { embedQuery } from '../_shared/embeddings.ts'
import { callLlm, streamNvidia, extractLlmText } from '../_shared/llm.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const body = await req.json()
    const { courseId, concept, question, courses, studentAnswer, correctAnswer, studentLevel, stream: useStream } = body
    const effectiveConcept = concept || question?.split(' ').slice(0, 4).join(' ') || 'general'

    if (!courseId) return jsonError(400, 'courseId required')

    const admin = getAdminClient()

    let context = ''
    try {
      const qvec = await embedQuery(effectiveConcept)
      const { data: chunks } = await admin.rpc('match_documents', {
        query_embedding: qvec,
        match_course_id: courseId,
        match_count: 4,
      })
      context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')
    } catch { /* RAG optional */ }

    const levelHint = studentLevel === 'beginner'
      ? 'Usa lenguaje muy simple, como para un niño de 10 años. Usa analogías cotidianas.'
      : studentLevel === 'advanced'
        ? 'Usa lenguaje técnico y preciso.'
        : 'Usa un lenguaje claro con ejemplos prácticos.'

    const system = `Eres un tutor paciente. Responde en español, máximo 200 palabras. ${levelHint}`

    let userMsg = `Concepto: ${effectiveConcept}\n`
    if (context) userMsg += `Material del curso:\n${context}\n\n`
    if (studentAnswer) userMsg += `El estudiante respondió: "${studentAnswer}"\n`
    if (correctAnswer) userMsg += `La respuesta correcta era: "${correctAnswer}"\n`
    userMsg += `Pregunta del estudiante: ${question || 'Explícame este concepto'}`

    if (useStream) {
      const llmRes = await callLlm({
        system,
        messages: [{ role: 'user', parts: [{ text: userMsg }] }],
        stream: true,
        temperature: 0.5,
        maxOutputTokens: 600,
      })
      if (!llmRes.ok || !llmRes.body) return jsonError(500, 'LLM error')

      const stream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder()
          try {
            for await (const delta of streamNvidia(llmRes)) {
              controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`))
            }
            controller.enqueue(enc.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (e) { controller.error(e as Error) }
        },
      })
      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      })
    }

    const llmRes = await callLlm({
      system,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.5,
      maxOutputTokens: 600,
    })
    if (!llmRes.ok) return jsonError(500, 'LLM error')
    const llmJson = await llmRes.json()
    const text = (extractLlmText(llmJson) || '').trim()
    return jsonOk({ text, explanation: text })
  } catch (e) {
    console.error('[reinforce]', e)
    return jsonError(500, e?.message || 'internal error')
  }
})

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
