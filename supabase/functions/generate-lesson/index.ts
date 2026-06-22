import { corsHeaders } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { embedQuery } from '../_shared/embeddings.ts'
import { callLlm, streamNvidia } from '../_shared/llm.ts'
import { LESSON_SYSTEM } from '../_shared/prompts/lesson.ts'

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

    const { courseId, nodeId, message } = reqBody
    if (!courseId || !nodeId) return new Response('Bad request', { status: 400, headers: corsHeaders })

    const admin = getAdminClient()
    const { data: course } = await admin.from('courses').select('id, title').eq('id', courseId).single()
    if (!course) return new Response('Course not found', { status: 404, headers: corsHeaders })

    // Find node by UUID or position
    const isPos = !nodeId.includes('-')
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
    if (!node) return new Response('Node not found', { status: 404, headers: corsHeaders })

    console.log(`[generate-lesson] courseId=${courseId} nodeId=${node.id} title="${node.title}"`)

    const qvec = await embedQuery(message || node.title)
    const { data: chunks } = await admin.rpc('match_documents', {
      query_embedding: qvec,
      match_course_id: courseId,
      match_count: 8,
    })
    const context = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n---\n\n')

    const userMsg = context
      ? `Material del curso:\n${context}\n\nGenera la lección para: "${node.title}". ${message ? `Pregunta: ${message}` : 'Desarrolla el contenido completo.'}`
      : `Genera la lección para "${node.title}" del curso "${course.title}". ${message || 'Desarrolla el contenido completo.'}`

    const llmRes = await callLlm({
      system: LESSON_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      stream: true,
      temperature: 0.6,
      maxOutputTokens: 6144,
    })
    if (!llmRes.ok || !llmRes.body) {
      const err = await llmRes.text().catch(() => 'unknown')
      console.error('[generate-lesson] LLM error:', llmRes.status, err.slice(0, 300))
      return new Response(JSON.stringify({ error: 'LLM error: ' + err.slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        let full = ''
        try {
          for await (const delta of streamNvidia(llmRes)) {
            full += delta
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: delta })}\n\n`))
          }
          if (full.trim()) {
            await admin.from('nodes').update({ content: full, status: 'published' }).eq('id', node.id)
          }
          controller.enqueue(enc.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e) {
          console.error('[generate-lesson] stream error:', e)
          controller.error(e)
        }
      },
    })
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  } catch (e) {
    console.error('[generate-lesson] error:', e)
    return new Response(JSON.stringify({ error: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
