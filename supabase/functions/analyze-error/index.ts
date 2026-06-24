// supabase/functions/analyze-error/index.ts
// Generate a one-sentence explanation of why a student got a question wrong
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken } from '../_shared/supabase-admin.ts'
import { callLlm, extractLlmText } from '../_shared/llm.ts'
import { ANALYZE_ERROR_SYSTEM } from '../_shared/prompts/analyze-error.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { question, userAnswer, correctAnswer, concept, studentLevel } = await req.json()
    if (!question || !correctAnswer) return jsonError(400, 'question and correctAnswer required')

    const userMsg = `Concepto: ${concept || 'general'}\nPregunta: ${question}\nRespuesta del estudiante: ${userAnswer || '(sin respuesta)'}\nRespuesta correcta: ${correctAnswer}`

    const temp = studentLevel === 'beginner' ? 0.6 : studentLevel === 'advanced' ? 0.3 : 0.4
    const formalityHint = studentLevel === 'beginner'
      ? '\nUsa un lenguaje muy simple, como si explicaras a un niño.'
      : studentLevel === 'advanced'
        ? '\nUsa lenguaje técnico y preciso.'
        : ''

    const llmRes = await callLlm({
      system: ANALYZE_ERROR_SYSTEM + formalityHint,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: temp,
      maxOutputTokens: 300,
    })
    if (!llmRes.ok) return jsonError(500, 'LLM error')
    const llmJson = await llmRes.json()
    const explanation = (extractLlmText(llmJson) || '').trim()
    return jsonOk({ explanation })
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
