// supabase/functions/generate-course-content/index.ts
// Batch-generates complete content (lessons, quizzes, exercises, exams) for ALL nodes of a course
import { corsHeaders } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm, extractLlmText } from '../_shared/llm.ts'

const ALLOWED_TYPES = ['theory', 'practice', 'quiz', 'boss', 'reward']

interface NodeToGenerate {
  id: string
  course_id: string
  position: number
  type: string
  title: string
  description: string
}

type GenResult = {
  nodeId: string
  type: string
  success: boolean
  content?: string
  error?: string
}

// Fetch relevant RAG chunks for context
async function fetchCourseContext(admin: ReturnType<typeof getAdminClient>, courseId: string): Promise<string> {
  try {
    // Try getting material from course description as fallback
    const { data: course } = await admin.from('courses').select('title, description, category').eq('id', courseId).single()
    const courseInfo = course
      ? `Curso: ${course.title}\nDescripción: ${course.description || ''}\nCategoría: ${course.category || ''}`
      : ''

    // Get any source files text directly
    const { data: sources } = await admin.from('source_files').select('id').eq('course_id', courseId).limit(3)
    if (sources && sources.length > 0) {
      const { data: docs } = await admin
        .from('documents')
        .select('content')
        .eq('course_id', courseId)
        .limit(10)
      if (docs && docs.length > 0) {
        const text = docs.map(d => d.content).join('\n\n').slice(0, 8000)
        return courseInfo + '\n\nMaterial del curso:\n' + text
      }
    }
    return courseInfo
  } catch {
    return ''
  }
}

async function generateTheoryContent(node: NodeToGenerate, context: string): Promise<string> {
  const system = `Eres un profesor experto. Genera el contenido completo de una leccion en formato HTML.

La leccion se titula: "${node.title}"
Descripcion: "${node.description}"

Formato requerido:
- Usa <h2> para subtitulos
- <p> para parrafos
- <div class="example-box">...</div> para ejemplos
- <ul>/<li> para listas
- <strong> para terminos clave
- Entre 400 y 800 palabras
- Español latino neutro
- Explica los conceptos de forma clara y pedagogica

Devuelve SOLO el HTML, sin markdown ni etiquetas de codigo.`

  const userMsg = context
    ? `${context}\n\nGenera la leccion "${node.title}" usando el material de referencia del curso.`
    : `Genera la leccion "${node.title}" para el curso. Descripcion: ${node.description}`

  const res = await callLlm({
    system,
    messages: [{ role: 'user', parts: [{ text: userMsg }] }],
    temperature: 0.7,
    maxOutputTokens: 4096,
  })
  if (!res.ok) throw new Error(`LLM error: ${res.status}`)
  const json = await res.json()
  return extractLlmText(json) || '<p>Contenido no disponible</p>'
}

async function generatePracticeContent(node: NodeToGenerate, context: string): Promise<string> {
  const system = `Eres un profesor que disena ejercicios practicos. Genera un ejercicio en HTML.

Titulo: "${node.title}"
Descripcion: "${node.description}"

Formato:
- <h2>Titulo del ejercicio</h2>
- <p>Instrucciones claras paso a paso</p>
- <div class="exercise-box">...</div> para el enunciado
- Si aplica, incluye <pre><code> para ejemplos de codigo
- <p class="hint">Pista: ...</p> para ayuda
- Entre 200 y 500 palabras
- Español latino neutro

Devuelve SOLO el HTML.`

  const userMsg = context
    ? `${context}\n\nGenera el ejercicio "${node.title}" basado en el material del curso.`
    : `Genera el ejercicio "${node.title}". ${node.description}`

  const res = await callLlm({
    system,
    messages: [{ role: 'user', parts: [{ text: userMsg }] }],
    temperature: 0.7,
    maxOutputTokens: 3072,
  })
  if (!res.ok) throw new Error(`LLM error: ${res.status}`)
  const json = await res.json()
  return extractLlmText(json) || '<p>Ejercicio no disponible</p>'
}

async function generateQuizContent(node: NodeToGenerate, context: string): Promise<string> {
  const system = `Eres un profesor que crea preguntas de opcion multiple. Genera 4 preguntas en JSON.

Titulo del quiz: "${node.title}"
Tema: "${node.description}"

Formato JSON:
{
  "questions": [
    {
      "id": 1,
      "text": "Pregunta?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 0,
      "explanation": "Breve explicacion de por que es correcta"
    }
  ]
}

Reglas:
- 4 preguntas
- 4 opciones cada una, solo UNA correcta
- "correct" es el indice 0-based de la opcion correcta
- Explicacion corta (< 50 caracteres)
- Español latino neutro

Devuelve SOLO el JSON.`

  const userMsg = context
    ? `${context}\n\nGenera 4 preguntas para "${node.title}" basadas en el material del curso.`
    : `Genera 4 preguntas para "${node.title}". ${node.description}`

  const res = await callLlm({
    system,
    messages: [{ role: 'user', parts: [{ text: userMsg }] }],
    temperature: 0.6,
    maxOutputTokens: 4096,
    json: true,
  })
  if (!res.ok) throw new Error(`LLM error: ${res.status}`)
  const json = await res.json()
  const text = extractLlmText(json) || '{}'
  return text
}

async function generateBossContent(node: NodeToGenerate, context: string): Promise<string> {
  const system = `Eres un profesor que disena examenes finales. Genera un examen completo (10 preguntas) en JSON.

Titulo del examen: "${node.title}"

Formato JSON (exactamente):
{
  "title": "${node.title}",
  "questions": [
    {
      "id": 1,
      "text": "Pregunta?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 0,
      "explanation": "Explicacion"
    }
  ]
}

Reglas:
- 10 preguntas variadas
- Mezcla de: conceptos teoricos, aplicacion practica, analisis
- 4 opciones cada una, solo UNA correcta
- "correct" es indice 0-based
- Español latino neutro

Devuelve SOLO el JSON.`

  const userMsg = context
    ? `${context}\n\nGenera el examen final "${node.title}" basado en el material del curso.`
    : `Genera el examen final "${node.title}". ${node.description}`

  const res = await callLlm({
    system,
    messages: [{ role: 'user', parts: [{ text: userMsg }] }],
    temperature: 0.6,
    maxOutputTokens: 8192,
    json: true,
  })
  if (!res.ok) throw new Error(`LLM error: ${res.status}`)
  const json = await res.json()
  const text = extractLlmText(json) || '{}'
  return text
}

async function generateRewardContent(node: NodeToGenerate): Promise<string> {
  return `<div class="reward-box" style="text-align:center;padding:40px">
    <h2>🏆 ${node.title}</h2>
    <p>${node.description || '¡Felicidades por completar esta seccion!'}</p>
    <div class="medal-placeholder" style="font-size:64px;margin:20px 0">🎖️</div>
    <p>Sigue asi, vas por buen camino en tu aprendizaje.</p>
  </div>`
}

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

    const { courseId, nodeIds } = reqBody
    if (!courseId) return new Response('Bad request', { status: 400, headers: corsHeaders })

    const admin = getAdminClient()

    // Get all nodes or specific ones
    let query = admin.from('nodes').select('id, course_id, position, type, title, description').eq('course_id', courseId)
    if (nodeIds && Array.isArray(nodeIds) && nodeIds.length > 0) {
      query = query.in('id', nodeIds)
    }
    const { data: nodes } = await query.order('position', { ascending: true })
    if (!nodes || nodes.length === 0) return new Response('No nodes', { status: 404, headers: corsHeaders })

    console.log(`[generate-course-content] generando contenido para ${nodes.length} nodos`)

    // Get course context for grounding
    const context = await fetchCourseContext(admin, courseId)

    // Generate content for each node in parallel batches (max 3 concurrent)
    const results: GenResult[] = []
    const batchSize = 3
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize)
      const batchResults = await Promise.allSettled(
        batch.map(async (node: NodeToGenerate) => {
          console.log(`[generate-course-content] generando nodo ${node.position} (${node.type}): ${node.title}`)
          let content = ''
          switch (node.type) {
            case 'theory':
              content = await generateTheoryContent(node, context)
              break
            case 'practice':
              content = await generatePracticeContent(node, context)
              break
            case 'quiz':
              content = await generateQuizContent(node, context)
              break
            case 'boss':
              content = await generateBossContent(node, context)
              break
            case 'reward':
              content = await generateRewardContent(node)
              break
          }
          // Save content to node and publish immediately
          const { error: updErr } = await admin
            .from('nodes')
            .update({ content, status: 'published' })
            .eq('id', node.id)
          if (updErr) throw updErr
          return { nodeId: node.id, type: node.type, success: true, content: content.slice(0, 100) } as GenResult
        })
      )
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value)
        } else {
          results.push({ nodeId: 'unknown', type: 'unknown', success: false, error: r.reason?.message || 'Error' })
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`[generate-course-content] completado: ${successCount}/${nodes.length} exitosos`)

    return new Response(JSON.stringify({
      total: nodes.length,
      success: successCount,
      failed: nodes.length - successCount,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[generate-course-content] error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
