// supabase/functions/reinforce/index.ts
// Generate a short reinforcement on a weak concept
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { embedQuery } from '../_shared/embeddings.ts'
import { callLlm, streamGemini } from '../_shared/llm.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { courseId, concept, message } = await req.json()
    if (!courseId || !concept) return new Response('Bad request', { status: 400, headers: corsHeaders })

    const admin = getAdminClient()
    const qvec = await embedQuery(concept)
    const { data: chunks } = await admin.rpc('match_documents', {
      query_embedding: qvec,
      match_course_id: courseId,
      match_count: 4,
    })
    const context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')
    const system = `Eres un tutor paciente. Refuerza el concepto "${concept}" para un estudiante que falló. Usa el material del curso si está disponible, sino conocimiento general. Explica en <= 150 palabras, en español, con un ejemplo cotidiano.`
    const userMsg = `Material:\n${context || '(sin material)'}\n\n${message ? `Pregunta del estudiante: ${message}` : ''}`

    const llmRes = await callLlm({
      system,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      stream: true,
      temperature: 0.5,
      maxOutputTokens: 600,
    })
    if (!llmRes.ok || !llmRes.body) return new Response('LLM error', { status: 500, headers: corsHeaders })

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        try {
          for await (const delta of streamGemini(llmRes)) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
          controller.enqueue(enc.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e) { controller.error(e) }
      },
    })
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: corsHeaders })
  }
})
