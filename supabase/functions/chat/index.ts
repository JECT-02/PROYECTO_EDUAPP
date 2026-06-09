// supabase/functions/chat/index.ts
// RAG chat with streaming SSE
import { corsHeaders } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { embedQuery } from '../_shared/embeddings.ts'
import { callLlm, streamNvidia } from '../_shared/llm.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // read body FIRST, before any headers/auth operations
  let reqBody: Record<string, unknown> = {}
  try {
    reqBody = JSON.parse(await req.text())
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const token = getAccessToken(req)
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { courseId, message, nodeId } = reqBody
    if (!courseId || !message) return new Response('Bad request', { status: 400, headers: corsHeaders })

    console.log(`[chat] courseId=${courseId} nodeId=${nodeId} message="${message.slice(0, 80)}..."`)

    const admin = getAdminClient()
    const qvec = await embedQuery(message)
    if (!qvec || qvec.length === 0) {
      console.error('[chat] embedQuery returned empty vector')
      return new Response(JSON.stringify({ error: 'Error generando embedding' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log(`[chat] embedding generado (${qvec.length} dims)`)

    const { data: chunks, error: rpcErr } = await admin.rpc('match_documents', {
      query_embedding: qvec,
      match_course_id: courseId,
      match_count: 6,
    })
    if (rpcErr) console.error('[chat] match_documents error:', rpcErr)
    console.log(`[chat] chunks encontrados: ${(chunks ?? []).length}`)

    const context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')
    const system = `Eres un tutor amigable del curso. Responde SOLO usando el contexto provisto. Si no sabes, dilo. Cita la sección del material entre comillas cuando puedas. Responde en español, claro y breve (<= 200 palabras).`
    const userMsg = `Contexto del material del curso:\n${context || '(sin material)'}\n\nPregunta del estudiante: ${message}`

    console.log('[chat] llamando a Gemini...')
    const llmRes = await callLlm({
      system,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      stream: true,
      temperature: 0.4,
    })
    if (!llmRes.ok || !llmRes.body) {
      const err = await llmRes.text().catch(() => 'unknown')
      console.error('[chat] LLM error:', llmRes.status, err.slice(0, 300))
      return new Response(JSON.stringify({ error: 'LLM error: ' + err.slice(0, 200) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log('[chat] Gemini respondio OK, iniciando stream...')

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        let totalChars = 0
        try {
          for await (const delta of streamNvidia(llmRes)) {
            totalChars += delta.length
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: delta })}\n\n`))
          }
          console.log(`[chat] stream completo: ${totalChars} chars enviados`)
          controller.enqueue(enc.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e) {
          console.error('[chat] error en stream:', e)
          controller.error(e)
        }
      },
    })
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  } catch (e) {
    console.error('[chat] error general:', e)
    return new Response(JSON.stringify({ error: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
