import { corsHeaders } from '../_shared/cors.ts'
import { getUserClient, getAccessToken, getAdminClient } from '../_shared/supabase-admin.ts'
import { callLlm, extractLlmText } from '../_shared/llm.ts'
import { ROADMAP_SYSTEM } from '../_shared/prompts/roadmap.ts'

type GenNode = { title: string; type: string; description: string; position: number; content?: string }
const ALLOWED_TYPES = new Set(['theory', 'quiz', 'boss'])

function enforceRegulation(nodes: GenNode[]): GenNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes
  const sorted = [...nodes].sort((a, b) => (a.position || 0) - (b.position || 0))

  // Convert non-allowed types to theory
  for (const n of sorted) { if (!ALLOWED_TYPES.has(n.type)) n.type = 'theory' }

  // First node must be theory
  if (sorted[0].type !== 'theory') {
    sorted[0] = { ...sorted[0], type: 'theory', title: sorted[0].title || 'Introduccion',
      content: sorted[0].content || '<h2>Introduccion</h2><p>Contenido de introduccion al tema.</p>' }
  }

  // Last node must be boss
  const lastIdx = sorted.length - 1
  if (sorted[lastIdx].type !== 'boss') {
    sorted.push({ title: 'Examen Final', type: 'boss', description: 'Examen final integrador.',
      position: lastIdx + 2, content: null })
  } else {
    sorted[lastIdx].type = 'boss'
  }

  // Enforce quiz every 2 theory nodes (not before boss)
  const result: GenNode[] = []
  let consecutiveTheory = 0
  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]
    if (node.type === 'theory') {
      consecutiveTheory++
      result.push(node)
      if (consecutiveTheory >= 2) {
        const nextNode = sorted[i + 1]
        if (!nextNode || (nextNode.type !== 'quiz' && nextNode.type !== 'boss')) {
          const theoryTitles = result.filter(n => n.type === 'theory').slice(-consecutiveTheory).map(n => n.title).join(', ')
          result.push({ title: 'Quiz: ' + theoryTitles.slice(0, 50), type: 'quiz',
            description: 'Evaluacion sobre: ' + theoryTitles, content: null, position: 0 })
          consecutiveTheory = 0
        }
      }
    } else {
      result.push(node)
      consecutiveTheory = 0
    }
  }

  // Ensure boss is last
  const bossIdx = result.findIndex(n => n.type === 'boss')
  if (bossIdx !== -1 && bossIdx !== result.length - 1) {
    const [boss] = result.splice(bossIdx, 1)
    result.push(boss)
  }

  // Ensure minimum 8 nodes
  if (result.length < 8) {
    while (result.length < 8 && result[result.length - 1]?.type !== 'boss') {
      result.splice(result.length - 1, 0, { title: 'Contenido adicional ' + result.length,
        type: 'theory', description: 'Contenido complementario.', content: null, position: 0 })
    }
  }

  // Reassign positions and fill missing content
  return result.map((n, i) => {
    const node = { ...n, position: i + 1 }
    if (!node.content || (typeof node.content === 'string' && node.content.trim().length === 0)) {
      if (node.type === 'quiz') {
        node.content = JSON.stringify({ questions: [
          { id: 1, text: 'Pregunta de ejemplo', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 0, explanation: 'Explicacion' },
          { id: 2, text: 'Segunda pregunta', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 1, explanation: 'Explicacion' },
          { id: 3, text: 'Tercera pregunta', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 2, explanation: 'Explicacion' },
          { id: 4, text: 'Cuarta pregunta', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 3, explanation: 'Explicacion' }
        ] })
      } else if (node.type === 'boss') {
        node.content = JSON.stringify({ questions: [
          { id: 1, text: 'Pregunta final 1', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 0, explanation: 'Explicacion' },
          { id: 2, text: 'Pregunta final 2', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 1, explanation: 'Explicacion' },
          { id: 3, text: 'Pregunta final 3', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 2, explanation: 'Explicacion' },
          { id: 4, text: 'Pregunta final 4', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 3, explanation: 'Explicacion' },
          { id: 5, text: 'Pregunta final 5', options: ['A) A', 'B) B', 'C) C', 'D) D'], correct: 0, explanation: 'Explicacion' }
        ], congratulations: 'Felicitaciones! Has completado exitosamente el curso. Demuestras un dominio solido de los temas tratados.' })
      } else {
        node.content = '<h2>' + node.title + '</h2><p>' + (node.description || 'Contenido de esta leccion.') + '</p>'
      }
    }
    return node
  })
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
      // Extract text from up to 3 files
      for (const src of sources.slice(0, 3)) {
        const text = await extractFileText(admin, src.id)
        if (text.length > 0) {
          materialText += `\n\n--- ${src.filename} ---\n\n${text.slice(0, 8000)}`
        }
      }
    }
    console.log(`[generate-roadmap] material: ${materialText.length} chars`)

    // Dynamic node count based on material size
    const nodeCount = materialText.length > 12000 ? 10 : 8

    const userMsg = `Curso: ${course.title}
Descripcion: ${course.description || ''}
Material:
${materialText || '(Sin material. Usa el nombre del curso.)'}

Genera un roadmap de ${nodeCount} nodos (minimo 8, maximo 12) en este patron:
theory -> theory -> quiz -> theory -> theory -> quiz -> ... -> boss

IMPORTANTE sobre las preguntas:
- Cada quiz: 4 preguntas ESPECIFICAS basadas en el material
- Cada boss: 6 preguntas ESPECIFICAS basadas en TODO el material
- NUNCA preguntas genericas
- Explicaciones de MINIMO 40 caracteres

El JSON DEBE tener esta estructura:
{"title":"Nombre del curso","nodes":[...]}
NO uses {"roadmap":[...]}. Usa {"title":"...","nodes":[...]}.
SOLO JSON valido. Sin markdown, sin texto extra.`
SOLO JSON valido. Sin markdown, sin texto extra.`

    const llmRes = await callLlm({
      system: ROADMAP_SYSTEM,
      messages: [{ role: 'user', parts: [{ text: userMsg }] }],
      temperature: 0.6,
      maxOutputTokens: 16384,
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
      console.warn('[generate-roadmap] Primer parse fallo, reintentando con prompt simplificado...')
      // Retry with simpler prompt
      const simpleMsg = `Curso: ${course.title}\nMaterial: ${(materialText || '').slice(0, 3000)}\n\nGenera 8 nodos: theory, theory, quiz, theory, theory, quiz, theory, boss.\nTheory: 250-400 palabras HTML. Quiz: 4 preguntas. Boss: 6 preguntas + congratulations.\nSOLO JSON.`
      const retryRes = await callLlm({
        system: ROADMAP_SYSTEM,
        messages: [{ role: 'user', parts: [{ text: simpleMsg }] }],
        temperature: 0.5,
        maxOutputTokens: 16384,
      })
      if (!retryRes.ok) {
        const errBody = await retryRes.text().catch(() => 'unknown')
        return jsonError(500, `LLM error en reintento: ${errBody.slice(0, 200)}`)
      }
      const retryJson = await retryRes.json()
      const retryRaw = extractLlmText(retryJson) || ''
      console.log('[generate-roadmap] reintento respuesta:', retryRaw.slice(0, 300))
      try {
        parsed = safeParseJson(retryRaw)
      } catch (e2) {
        console.error('[generate-roadmap] Ambos parseos fallaron')
        return jsonError(500, `La IA no pudo generar el roadmap: ${e2?.message}`)
      }
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
function normalizeRoadmap(obj: any): { title?: string; nodes: GenNode[] } {
  if (!obj) return { title: '', nodes: [] }
  if (obj.nodes && Array.isArray(obj.nodes)) return obj
  if (Array.isArray(obj.roadmap)) return { title: obj.title || '', nodes: obj.roadmap }
  if (obj.roadmap?.nodes && Array.isArray(obj.roadmap.nodes)) return obj.roadmap
  if (obj.data?.nodes && Array.isArray(obj.data.nodes)) return obj.data
  if (Array.isArray(obj)) return { title: '', nodes: obj }
  return { title: '', nodes: [] }
}

function safeParseJson(raw: string): { nodes?: GenNode[] } {
  if (!raw || raw === '{}') throw new Error('Respuesta vacia')

  // Attempt 1: direct parse
  try { const r = JSON.parse(raw); return normalizeRoadmap(r) } catch {}

  // Attempt 2: strip markdown fences and common prefixes
  let s = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/im, '')
    .replace(/^Here['']s?\s+(?:the\s+)?(?:JSON|roadmap)[^.:]*[:.]?\s*/im, '')
    .trim()
  try { const r = JSON.parse(s); return normalizeRoadmap(r) } catch {}

  // Attempt 3: extract first { ... last } (greedy)
  const i1 = s.indexOf('{')
  const i2 = s.lastIndexOf('}')
  if (i1 !== -1 && i2 > i1) {
    const core = s.slice(i1, i2 + 1)
    try { const r = JSON.parse(core); return normalizeRoadmap(r) } catch {}

    // Attempt 4: fix trailing commas
    const fixed = core.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/gm, '')
    try { const r = JSON.parse(fixed); return normalizeRoadmap(r) } catch {}
  }

  // Attempt 5: greedy match outermost { ... } and try to fix truncated JSON
  const greedy = raw.match(/\{[\s\S]*\}/)
  if (greedy) {
    let g = greedy[0].replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/gm, '')
    try { const r = JSON.parse(g); return normalizeRoadmap(r) } catch {}

    // Try to fix truncated JSON by closing open brackets/braces
    const openBraces = (g.match(/{/g) || []).length
    const closeBraces = (g.match(/}/g) || []).length
    const openBrackets = (g.match(/\[/g) || []).length
    const closeBrackets = (g.match(/]/g) || []).length
    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      let repaired = g
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']'
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}'
      try { const r = JSON.parse(repaired); return normalizeRoadmap(r) } catch {}
    }
  }

  // Attempt 6: extract just the nodes array
  const nodesMatch = raw.match(/"nodes"\s*:\s*\[[\s\S]*\]/)
  if (nodesMatch) {
    const wrapped = `{${nodesMatch[0]}}`
    try { const r = JSON.parse(wrapped); return r } catch {}
  }

  throw new Error('No se pudo extraer JSON de la respuesta de IA')
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
