// supabase/functions/generate-lesson/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { embedQuery } from '../_shared/embeddings.ts'
import { callLlm, streamGemini } from '../_shared/llm.ts'
import { LESSON_SYSTEM } from '../_shared/prompts/lesson.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { courseId, nodeId, message } = await req.json()
    if (!courseId || !nodeId) return new Response('Bad request', { status: 400, headers: corsHeaders })

    const admin = getAdminClient()
    const { data: node } = await admin.from('nodes').select('*').eq('id', nodeId).single()
    if (!node) return new Response('node not found', { status: 404, headers: corsHeaders })

    const qvec = await embedQuery(message || node.title)
    const { data: chunks } = await admin.rpc('match_documents', {
      query_embedding: qvec,
      match_course_id: courseId,
      match_count: 8,
    })
    const context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')
    const userMsg = `Material del curso:\n${context || '(sin material aún, usa conocimiento general sobre: ' + node.title + ')'}\n\nGenera la lección para el nodo: "${node.title}". ${message ? `Estudiante pregunta: ${message}` : ''}`

    const llmRes = await callLlm({
      system: LESSON_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      stream: true,
      temperature: 0.6,
      maxOutputTokens: 3000,
    })
    if (!llmRes.ok || !llmRes.body) {
      const err = await llmRes.text()
      return new Response(`LLM error: ${err}`, { status: 500, headers: corsHeaders })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        let full = ''
        try {
          for await (const delta of streamGemini(llmRes)) {
            full += delta
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
          await admin.from('nodes').update({ content: full, status: 'pending_review' }).eq('id', nodeId)
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
