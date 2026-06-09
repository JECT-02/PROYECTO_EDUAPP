// supabase/functions/generate-medal-svg/index.ts
// Generate an SVG medal for a student achievement
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm, extractLlmText } from '../_shared/llm.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { studentId, achievement, rarity = 'common' } = await req.json()
    if (!studentId || !achievement) return jsonError(400, 'studentId and achievement required')

    const system = `Eres un diseñador de insignias SVG. Genera un SVG minimalista (viewBox 0 0 200 200) que represente "${achievement}".
Reglas:
- Solo SVG, sin texto, sin xmlns (lo añadimos nosotros).
- Forma circular o de medalla.
- Color principal según rareza: common=#94A3B8, rare=#6C63FF, epic=#F59E0B, legendary=#EC4899.
- Devuelve SOLO el contenido del SVG (sin <svg> envolvente).`

    const llmRes = await callLlm({
      system,
      messages: [{ role: 'user', parts: [{ text: `Logro: ${achievement}\nRareza: ${rarity}` }] }],
      temperature: 0.8,
      maxOutputTokens: 600,
    })
    if (!llmRes.ok) return jsonError(500, 'LLM error')
    const llmJson = await llmRes.json()
    const inner = (extractLlmText(llmJson) || '').trim()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${inner}</svg>`

    const admin = getAdminClient()
    const { data, error } = await admin.from('medals').insert({
      student_id: studentId,
      achievement,
      rarity,
      svg_data: svg,
    }).select().single()
    if (error) return jsonError(500, error.message)
    return jsonOk({ medal: data })
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
