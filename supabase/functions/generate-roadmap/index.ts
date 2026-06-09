import { corsHeaders } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm, extractLlmText } from '../_shared/llm.ts'
import { ROADMAP_SYSTEM } from '../_shared/prompts/roadmap.ts'

type GenNode = { title: string; type: string; description: string; position: number; content?: string }
const ALLOWED_TYPES = new Set(['theory', 'practice', 'quiz', 'boss', 'reward'])

const DEFAULT_BOSS_CONTENT = JSON.stringify({
  title: 'Examen final',
  questions: [
    { id: 1, text: '¿Cuál es el concepto principal abordado en este curso?', options: ['A) Concepto A', 'B) Concepto B', 'C) Concepto C', 'D) Concepto D'], correct: 0, explanation: 'Revisa el material del curso para confirmar.' },
    { id: 2, text: '¿Qué aplicación práctica tiene lo aprendido?', options: ['A) Aplicación 1', 'B) Aplicación 2', 'C) Aplicación 3', 'D) Aplicación 4'], correct: 1, explanation: 'La aplicación correcta se describe en las lecciones.' },
    { id: 3, text: '¿Cómo se relacionan los conceptos clave?', options: ['A) Relación A', 'B) Relación B', 'C) Relación C', 'D) Relación D'], correct: 2, explanation: 'La relación se explica en la teoría del curso.' },
    { id: 4, text: '¿Cuál de los siguientes es un ejemplo práctico?', options: ['A) Ejemplo 1', 'B) Ejemplo 2', 'C) Ejemplo 3', 'D) Ejemplo 4'], correct: 3, explanation: 'Este ejemplo se cubre en la sección práctica.' },
    { id: 5, text: '¿Qué habilidad desarrolla este módulo?', options: ['A) Habilidad 1', 'B) Habilidad 2', 'C) Habilidad 3', 'D) Habilidad 4'], correct: 0, explanation: 'La habilidad se desarrolla a lo largo del curso.' },
    { id: 6, text: '¿Cuál es la mejor estrategia para aplicar este conocimiento?', options: ['A) Estrategia 1', 'B) Estrategia 2', 'C) Estrategia 3', 'D) Estrategia 4'], correct: 1, explanation: 'La estrategia se detalla en las lecciones avanzadas.' },
    { id: 7, text: '¿Qué error común se debe evitar?', options: ['A) Error 1', 'B) Error 2', 'C) Error 3', 'D) Error 4'], correct: 2, explanation: 'Este error se menciona en las advertencias del curso.' },
    { id: 8, text: '¿Cómo se mide el éxito en este tema?', options: ['A) Métrica 1', 'B) Métrica 2', 'C) Métrica 3', 'D) Métrica 4'], correct: 3, explanation: 'La métrica se define en los objetivos del curso.' },
    { id: 9, text: '¿Qué recurso complementario recomiendas?', options: ['A) Recurso 1', 'B) Recurso 2', 'C) Recurso 3', 'D) Recurso 4'], correct: 0, explanation: 'El recurso se menciona en las referencias.' },
    { id: 10, text: '¿Cuál es el siguiente paso después de este curso?', options: ['A) Siguiente curso', 'B) Práctica avanzada', 'C) Proyecto final', 'D) Repaso general'], correct: 2, explanation: 'El proyecto final integra todos los conceptos aprendidos.' },
  ],
})

function enforceRegulation(nodes: GenNode[]): GenNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes
  const sorted = [...nodes].sort((a, b) => (a.position || 0) - (b.position || 0))
  for (const n of sorted) {
    if (!ALLOWED_TYPES.has(n.type)) n.type = 'theory'
  }
  if (sorted[0].type !== 'theory') {
    sorted[0] = { ...sorted[0], type: 'theory', title: sorted[0].title || 'Bienvenida', content: sorted[0].content || `<h2>Bienvenida</h2><p>Comienza tu viaje de aprendizaje en este curso.</p>` }
  }
  const lastIdx = sorted.length - 1
  if (sorted[lastIdx].type !== 'boss') {
    sorted.push({
      title: 'Examen final', type: 'boss',
      description: 'Desafío final integrador del curso.',
      position: lastIdx + 2,
      content: DEFAULT_BOSS_CONTENT,
    })
  } else {
    sorted[lastIdx].type = 'boss'
    if (!sorted[lastIdx].content) {
      sorted[lastIdx].content = DEFAULT_BOSS_CONTENT
    }
  }
  let lastQuizPos = -10
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === 'quiz') {
      if (i - lastQuizPos < 3) {
        sorted[i] = { ...sorted[i], type: 'practice' }
      } else {
        lastQuizPos = i
      }
    }
    // Ensure each node has at least minimal content
    if (!sorted[i].content && sorted[i].type !== 'reward') {
      sorted[i] = {
        ...sorted[i],
        content: sorted[i].type === 'quiz'
          ? JSON.stringify({ questions: [{ id: 1, text: '¿Pregunta de ejemplo?', options: ['A) Opción A', 'B) Opción B', 'C) Opción C', 'D) Opción D'], correct: 0, explanation: 'Explicación' }] })
          : `<h2>${sorted[i].title}</h2><p>${sorted[i].description || 'Contenido de esta lección.'}</p><p>El contenido detallado será generado automáticamente. Puedes editarlo o regenerarlo usando el asistente IA.</p>`,
      }
    }
  }
  return sorted.map((n, i) => ({ ...n, position: i + 1 }))
}

async function extractFileText(admin: ReturnType<typeof getAdminClient>, sourceId: string): Promise<string> {
  try {
    const { data: src } = await admin.from('source_files').select('*').eq('id', sourceId).single()
    if (!src?.storage_path) return ''
    const { data: blob } = await admin.storage.from('course-source').download(src.storage_path)
    if (!blob) return ''
    const buf = await blob.arrayBuffer()
    const ext = src.filename?.split('.').pop()?.toLowerCase() || ''
    try {
      if (ext === 'pdf') {
        const { parse: parsePdf } = await import('npm:pdf-parse@1.1.1')
        const result = await parsePdf(new Uint8Array(buf))
        if (result?.text) return result.text
      }
      if (ext === 'docx') {
        const mammoth = await import('npm:mammoth@1.7.2')
        const result = await mammoth.extractRawText({ buffer: new Uint8Array(buf) })
        if (result?.value) return result.value
      }
    } catch (e) {
      console.warn(`[generate-roadmap] npm extractor falló para ${ext}:`, e?.message?.slice(0, 100))
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(buf)
  } catch (e) {
    console.warn(`[generate-roadmap] error extrayendo ${sourceId}:`, e?.message?.slice(0, 100))
    return ''
  }
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
    return jsonError(400, 'Invalid JSON body')
  }

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { courseId, level = 3, rigor = 3 } = reqBody
    if (!courseId) return jsonError(400, 'courseId required')

    const admin = getAdminClient()
    const { data: course } = await admin.from('courses').select('*').eq('id', courseId).single()
    if (!course) return jsonError(404, 'course not found')

    const { data: sources } = await admin
      .from('source_files').select('id, filename, storage_path, file_type')
      .eq('course_id', courseId).limit(5)

    console.log(`[generate-roadmap] course=${course.title}, sources=${(sources ?? []).length}`)

    let materialText = ''
    if (sources && sources.length > 0) {
      // Only extract text from the first file to save time (free tier limit)
      const src = sources[0]
      const text = await extractFileText(admin, src.id)
      if (text.length > 0) {
        materialText = `\n\n--- ${src.filename} ---\n\n${text.slice(0, 3000)}`
      }
    }
    console.log(`[generate-roadmap] material: ${materialText.length} chars`)

    const userMsg = `Curso: ${course.title}
Descripción: ${course.description || 'Sin descripción'}
Categoría: ${course.category || 'general'}
Nivel: ${level}/5, rigor: ${rigor}/5.
${materialText
  ? `Material de referencia:\n${materialText}`
  : '(Sin archivos de referencia. Usa el nombre y descripción del curso.)'}

Genera 5-10 nodos con contenido completo. SOLO JSON, sin markdown.`

    const llmRes = await callLlm({
      system: ROADMAP_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.6,
      maxOutputTokens: 4096,
    })
    if (!llmRes.ok) {
      const errBody = await llmRes.text().catch(() => 'unknown')
      console.error('[generate-roadmap] LLM error:', llmRes.status, errBody.slice(0, 300))
      return jsonError(500, 'LLM error: ' + errBody.slice(0, 200))
    }
    const llmJson = await llmRes.json()
    const raw = extractLlmText(llmJson) || ''
    console.log('[generate-roadmap] respuesta IA (primeros 300):', raw.slice(0, 300))

    let parsed: { nodes?: GenNode[] }
    try {
      parsed = safeParseJson(raw)
    } catch (e) {
      console.error('[generate-roadmap] JSON parse error:', raw.slice(0, 500))
      return jsonError(500, `Error al parsear respuesta de la IA: ${e?.message}`)
    }

    const generated = enforceRegulation(parsed.nodes ?? [])
    if (generated.length === 0) return jsonError(500, 'No se pudieron generar nodos')

    console.log(`[generate-roadmap] ${generated.length} nodos con contenido, guardando...`)

    // Delete old nodes and insert new ones with FULL content
    await admin.from('nodes').delete().eq('course_id', courseId)

    const rows = generated.map((n) => ({
      course_id: courseId,
      title: String(n.title || '').slice(0, 120),
      type: ALLOWED_TYPES.has(n.type) ? n.type : 'theory',
      description: String(n.description || '').slice(0, 300),
      position: n.position,
      content: n.content || '',
      status: 'published',
    }))

    const { data: inserted, error: insErr } = await admin.from('nodes').insert(rows).select()
    if (insErr) {
      console.error('[generate-roadmap] error insert:', insErr)
      return jsonError(500, insErr.message)
    }

    console.log(`[generate-roadmap] guardados ${inserted?.length || 0} nodos (publicados)`)
    return jsonOk({ nodes: inserted, count: inserted?.length || 0, regulation_applied: true })
  } catch (e) {
    console.error('[generate-roadmap] error:', e)
    return jsonError(500, e?.message || 'internal error')
  }
})

/**
 * Extrae y parsea JSON de la respuesta cruda de la IA.
 * Estrategias en orden: normalizar escapes → quitar fences → extraer {} →
 * directo (con doble parseo) → eliminar comas finales (en bucle hasta estabilizar) →
 * intentar de nuevo.
 */
function safeParseJson(raw: string): { nodes?: GenNode[] } {
  if (!raw || raw === '{}') throw new Error('Respuesta vacía')

  // 1. Normalizar escapes literales que a veces mete Gemini
  let s = raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')

  // 2. Quitar bloques markdown ```json ... ```
  s = s.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()

  // 3. Extraer solo el objeto JSON más externo { ... }
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1)
  }

  // Helper: intenta parsear + doble parse si es string
  function attempt(text: string): { nodes?: GenNode[] } | null {
    try {
      const r = JSON.parse(text)
      if (typeof r === 'string' && r.trim().startsWith('{')) {
        try { return JSON.parse(r) } catch {}
      }
      return r
    } catch { return null }
  }

  // 4. Intento directo
  const d1 = attempt(s)
  if (d1) {
    // NVIDIA sometimes wraps in {"roadmap":{...}}
    if (d1.roadmap && Array.isArray(d1.roadmap.nodes)) return d1.roadmap
    return d1
  }

  // 5. Eliminar comas finales en bucle hasta que no cambie más
  //    (cubre comas antes de ] o } con cualquier whitespace)
  let prev = ''
  let cleaned = s
  while (cleaned !== prev) {
    prev = cleaned
    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1')   // , } → }  y  , ] → ]
      .replace(/,\s*$/gm, '')           // coma al final de línea (multiline)
  }

  const d2 = attempt(cleaned)
  if (d2) return d2

  // 6. Si aún falla, intentar con el texto original pero quitando solo comas
  //    (por si la normalización introdujo problemas con contenido HTML)
  try {
    const fallback = raw
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```$/im, '')
    const fb = fallback.trim()
    const f1 = fb.indexOf('{')
    const f2 = fb.lastIndexOf('}')
    const core = f1 !== -1 && f2 > f1 ? fb.slice(f1, f2 + 1) : fb
    const fixed = core.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/gm, '')
    const r3 = attempt(fixed)
    if (r3) return r3
  } catch {}

  throw new Error(`No se pudo extraer JSON. Inicio: ${raw.slice(0, 200)}`)
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
