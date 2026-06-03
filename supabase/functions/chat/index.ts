// supabase/functions/chat/index.ts
// RAG chat with streaming SSE
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

    const { courseId, message, nodeId } = await req.json()
    if (!courseId || !message) return new Response('Bad request', { status: 400, headers: corsHeaders })

    const admin = getAdminClient()
    const qvec = await embedQuery(message)
    const { data: chunks } = await admin.rpc('match_documents', {
      query_embedding: qvec,
      match_course_id: courseId,
      match_count: 6,
    })

    const context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')
    const system = `Eres un tutor amigable del curso. Responde SOLO usando el contexto provisto. Si no sabes, dilo. Cita la sección del material entre comillas cuando puedas. Responde en español, claro y breve (<= 200 palabras).`
    const userMsg = `Contexto del material del curso:\n${context || '(sin material)'}\n\nPregunta del estudiante: ${message}`

    const llmRes = await callLlm({
      system,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      stream: true,
      temperature: 0.4,
    })
    if (!llmRes.ok || !llmRes.body) {
      const err = await llmRes.text()
      return new Response(`LLM error: ${err}`, { status: 500, headers: corsHeaders })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        try {
          for await (const delta of streamGemini(llmRes)) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
          controller.enqueue(enc.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      },
    })
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
