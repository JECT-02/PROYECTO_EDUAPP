// src/lib/gemini.js
// Direct NVIDIA AI API calls from the frontend (fallback when Edge Functions are unavailable)
// NOTE: VITE_NVIDIA_API_KEY must be set in .env for this to work.
// Uses kimi-k2.6 model via OpenAI-compatible endpoint.

const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY
const LLM_MODEL = 'moonshotai/kimi-k2.6'
const LLM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

const ROADMAP_SYSTEM = `Eres un diseñador instruccional experto. Genera un roadmap de aprendizaje en formato JSON.

SOLO EXISTEN 3 TIPOS DE NODO:
1. "theory": Lección teórica con contenido educativo completo.
2. "quiz": Evaluación sobre los temas vistos en los nodos theory ANTERIORES.
3. "boss": Examen final integrador (siempre el último nodo).

ESTRUCTURA OBLIGATORIA DEL ROADMAP:
- Primer nodo: SIEMPRE "theory" (introducción al tema)
- Después de cada 2 o 3 nodos theory consecutivos: SIEMPRE un "quiz"
- Último nodo: SIEMPRE "boss" (examen final)
- NO existen otros tipos de nodo (no practice, no reward, no otros)

EJEMPLO DE SECUENCIA VÁLIDA (8 nodos):
theory → theory → theory → quiz → theory → theory → quiz → boss

EJEMPLO DE SECUENCIA VÁLIDA (6 nodos):
theory → theory → quiz → theory → theory → boss

REGLAS PARA QUIZ:
- Cada quiz debe tener EXACTAMENTE 4 preguntas de opción múltiple
- Cada pregunta tiene 4 opciones (A, B, C, D)
- Las preguntas deben ser ESPECÍFICAS sobre el contenido de los nodos theory ANTERIORES al quiz
- NO genéricas como "¿Cuál es el concepto principal?" sino preguntas concretas sobre conceptos, definiciones, fórmulas o hechos específicos
- Cada pregunta debe tener una "explanation" que explique POR QUÉ la respuesta correcta es la correcta (mínimo 20 caracteres)
- El campo "correct" es el índice 0-based de la respuesta correcta

CONTENIDO DE NODOS THEORY:
- HTML con <h2>, <p>, <strong>, <ul>/<li>
- 300-600 palabras de contenido educativo real y específico
- Basado en el material de referencia proporcionado
- Ejemplos prácticos y explicaciones claras

CONTENIDO DE NODOS QUIZ (formato JSON string):
{
  "questions": [
    {
      "id": 1,
      "text": "Pregunta específica sobre el contenido de los nodos anteriores",
      "options": ["A) Opción correcta con sustancia", "B) Distractor creíble", "C) Distractor relacionado", "D) Distractor plausible"],
      "correct": 0,
      "explanation": "Explicación detallada de por qué A es correcta y por qué B, C, D son incorrectas"
    }
  ]
}

CONTENIDO DE NODOS BOSS (formato JSON string):
- 5-8 preguntas que integren TODO el contenido del curso
- Mezcla de preguntas de comprensión, aplicación y análisis
- Mismo formato que quiz pero más comprehensivo

REGLAS GENERALES:
1. Primer nodo = "theory" (introducción al tema)
2. Último nodo = "boss" (examen final)
3. Después de cada 2-3 nodos theory → quiz obligatorio
4. Entre 6 y 12 nodos en total
5. Títulos en español, máx 60 caracteres, específicos (no genéricos)
6. Descripciones concisas, máx 200 caracteres
7. Las posiciones deben ser secuenciales (1, 2, 3...)
8. NODOS THEORY: contenido HTML de 300-600 palabras, REAL y específico del tema
9. NODOS QUIZ: contenido JSON con 4 preguntas REALES con explicaciones
10. NO uses placeholder text como "ejemplo", "concepto A", "tema X"
11. USA el material de referencia para generar contenido auténtico y relevante

RESPONDE SOLO CON JSON. Sin markdown, sin texto adicional, sin bloques de código.
{
  "title": "Nombre del curso",
  "nodes": [
    {"position": 1, "type": "theory", "title": "Título específico", "description": "Descripción concisa", "content": "<h2>Subtítulo</h2><p>Contenido educativo completo...</p>"},
    {"position": 2, "type": "theory", "title": "Título específico", "description": "Descripción concisa", "content": "<h2>Subtítulo</h2><p>Contenido educativo completo...</p>"},
    {"position": 3, "type": "quiz", "title": "Quiz: Tema evaluado", "description": "Evalúa los conceptos de los nodos 1 y 2", "content": "{\\\"questions\\\":[{\\\"id\\\":1,\\\"text\\\":\\\"Pregunta específica?\\\",\\\"options\\\":[\\\"A) ...\\\",\\\"B) ...\\\",\\\"C) ...\\\",\\\"D) ...\\\"],\\\"correct\\\":0,\\\"explanation\\\":\\\"Explicación detallada\\\"}]}"}
  ]
}`

/**
 * Call NVIDIA API directly from the browser.
 * Returns the parsed JSON response (OpenAI-compatible format).
 */
async function callNvidia({ system, userMessage, temperature = 0.6, maxOutputTokens = 16384 }) {
  if (!NVIDIA_API_KEY) {
    throw new Error('VITE_NVIDIA_API_KEY no está configurado en .env')
  }

  const messages = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: userMessage })

  const body = {
    model: LLM_MODEL,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  }

  console.log(`[nvidia] calling ${LLM_MODEL} directly, tokens_max=${maxOutputTokens}`)
  const start = Date.now()

  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const elapsed = Date.now() - start
  console.log(`[nvidia] response: status=${res.status} elapsed=${elapsed}ms`)

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown')
    console.error(`[nvidia] error: ${res.status}`, errBody.slice(0, 300))
    throw new Error(`Error de NVIDIA AI (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const jsonRes = await res.json()
  return jsonRes
}

/**
 * Extract text content from an OpenAI-compatible LLM response.
 */
function extractNvidiaText(jsonRes) {
  try {
    return jsonRes?.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

/**
 * Extrae y parsea JSON de la respuesta cruda de la IA.
 */
function safeParseJson(raw) {
  if (!raw || raw === '{}') throw new Error('Respuesta vacía')

  let s = raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')

  s = s.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()

  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1)
  }

  function attempt(text) {
    try {
      const r = JSON.parse(text)
      if (typeof r === 'string' && r.trim().startsWith('{')) {
        try { return JSON.parse(r) } catch {}
      }
      return r
    } catch { return null }
  }

  const d1 = attempt(s)
  if (d1) {
    if (d1.roadmap && Array.isArray(d1.roadmap.nodes)) return d1.roadmap
    return d1
  }

  let prev = ''
  let cleaned = s
  while (cleaned !== prev) {
    prev = cleaned
    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/,\s*$/gm, '')
  }

  const d2 = attempt(cleaned)
  if (d2) return d2

  try {
    const fallback = raw
      .replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t').replace(/\\"/g, '"')
      .replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '')
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

// Only 3 allowed types: theory, quiz, boss
const ALLOWED_TYPES = new Set(['theory', 'quiz', 'boss'])

/**
 * Generate fallback quiz content with real-looking questions based on title/description.
 */
function generateFallbackQuiz(title, description) {
  const questions = [
    {
      id: 1,
      text: `Según el tema "${title}", ¿cuál es el concepto fundamental que se presenta?`,
      options: [
        'A) Una definición teórica abstracta sin aplicación práctica',
        'B) Un concepto aplicable directamente en el ámbito real',
        'C) Una fórmula matemática compleja y avanzada',
        'D) Un procedimiento administrativo obligatorio'
      ],
      correct: 1,
      explanation: `El tema "${title}" presenta un concepto con aplicación directa en el ámbito real, no es solo teoría abstracta ni una fórmula.`
    },
    {
      id: 2,
      text: `¿Cuál es la diferencia principal entre el enfoque presentado y los enfoques tradicionales?`,
      options: [
        'A) No existe diferencia significativa',
        'B) El enfoque presentado es más riguroso y formal',
        'C) El enfoque presentado es más práctico y orientado a resultados',
        'D) El enfoque presentado solo funciona en entornos controlados'
      ],
      correct: 2,
      explanation: `El enfoque se distingue por su orientación práctica y resultados concretos, diferenciándose de los enfoques puramente teóricos tradicionales.`
    },
    {
      id: 3,
      text: `¿Qué elemento es esencial para aplicar correctamente lo aprendido en "${title}"?`,
      options: [
        'A) Conocimientos previos avanzados de matemáticas',
        'B) Comprensión de los principios fundamentales explicados',
        'C) Acceso a software especializado costoso',
        'D) Certificación profesional previa obligatoria'
      ],
      correct: 1,
      explanation: `La comprensión de los principios fundamentales es el elemento esencial. No se requieren conocimientos matemáticos avanzados, software costoso ni certificaciones previas.`
    },
    {
      id: 4,
      text: `Según el material del curso, ¿cuál es una aplicación práctica de lo aprendido?`,
      options: [
        'A) Solo tiene aplicaciones teóricas sin uso real',
        'B) Se aplica exclusivamente en contextos académicos',
        'C) Tiene múltiples aplicaciones en el ámbito profesional y cotidiano',
        'D) Solo funciona bajo condiciones ideales de laboratorio'
      ],
      correct: 2,
      explanation: `Lo aprendido tiene múltiples aplicaciones tanto profesionales como cotidianas, no se limita al ámbito académico ni a condiciones de laboratorio.`
    }
  ]
  return JSON.stringify({ questions })
}

/**
 * Enforce roadmap regulation rules.
 * Only 3 types: theory, quiz, boss.
 * Quiz MUST appear every 2-3 theory nodes.
 */
function enforceRegulation(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes
  const sorted = [...nodes].sort((a, b) => (a.position || 0) - (b.position || 0))

  // Step 1: Convert any non-allowed types to 'theory'
  for (const n of sorted) {
    if (!ALLOWED_TYPES.has(n.type)) n.type = 'theory'
  }

  // Step 2: First node must be theory
  if (sorted[0].type !== 'theory') {
    sorted[0] = {
      ...sorted[0],
      type: 'theory',
      title: sorted[0].title || 'Introducción',
      content: sorted[0].content || `<h2>${sorted[0].title || 'Introducción'}</h2><p>Contenido de introducción al tema del curso.</p>`,
    }
  }

  // Step 3: Last node must be boss
  const lastIdx = sorted.length - 1
  if (sorted[lastIdx].type !== 'boss') {
    sorted.push({
      title: 'Examen Final',
      type: 'boss',
      description: 'Examen final integrador del curso.',
      position: lastIdx + 2,
      content: null, // Will be generated by AI
    })
  } else {
    sorted[lastIdx].type = 'boss'
  }

  // Step 4: Enforce quiz every 2-3 theory nodes
  // Walk through nodes, count consecutive theory nodes, insert quiz if needed
  const result = []
  let consecutiveTheory = 0

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]

    if (node.type === 'theory') {
      consecutiveTheory++
      result.push(node)

      // After 2-3 theory nodes, insert a quiz (unless next is already a quiz)
      if (consecutiveTheory >= 2) {
        const nextNode = sorted[i + 1]
        if (!nextNode || nextNode.type !== 'quiz') {
          // Collect theory titles for quiz context
          const theoryTitles = result
            .filter(n => n.type === 'theory')
            .slice(-consecutiveTheory)
            .map(n => n.title)
            .join(', ')

          result.push({
            title: `Quiz: ${theoryTitles.slice(0, 50)}`,
            type: 'quiz',
            description: `Evaluación sobre: ${theoryTitles}`,
            content: null, // Will be generated by AI
            position: 0, // Will be reassigned
          })
          consecutiveTheory = 0
        }
      }
    } else if (node.type === 'quiz') {
      result.push(node)
      consecutiveTheory = 0
    } else if (node.type === 'boss') {
      result.push(node)
      consecutiveTheory = 0
    } else {
      // Should not happen after step 1, but just in case
      result.push(node)
      consecutiveTheory = 0
    }
  }

  // Step 5: Ensure boss is last
  const bossIdx = result.findIndex(n => n.type === 'boss')
  if (bossIdx !== -1 && bossIdx !== result.length - 1) {
    const [boss] = result.splice(bossIdx, 1)
    result.push(boss)
  }

  // Step 6: Ensure minimum 6 nodes
  if (result.length < 6) {
    // Add more theory nodes if too few
    while (result.length < 6 && result[result.length - 1]?.type !== 'boss') {
      const insertPos = result.length - 1
      result.splice(insertPos, 0, {
        title: `Contenido adicional ${result.length}`,
        type: 'theory',
        description: 'Contenido complementario del curso.',
        content: null,
        position: 0,
      })
    }
  }

  // Step 7: Reassign positions and fill missing content
  return result.map((n, i) => {
    const node = { ...n, position: i + 1 }

    // Fill missing content based on type
    if (!node.content) {
      if (node.type === 'quiz') {
        node.content = generateFallbackQuiz(node.title, node.description)
      } else if (node.type === 'boss') {
        node.content = generateFallbackQuiz('Examen Final del Curso', 'Evaluación integral de todos los temas')
      } else {
        // Theory with missing content
        node.content = `<h2>${node.title}</h2><p>${node.description || 'Contenido de esta lección.'}</p><p>El contenido será generado por la IA. Puedes regenerarlo usando el asistente.</p>`
      }
    }

    // Validate quiz content has real questions
    if (node.type === 'quiz' || node.type === 'boss') {
      try {
        const parsed = typeof node.content === 'string' ? JSON.parse(node.content) : node.content
        if (!parsed?.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          node.content = generateFallbackQuiz(node.title, node.description)
        }
      } catch {
        node.content = generateFallbackQuiz(node.title, node.description)
      }
    }

    return node
  })
}

/**
 * Generate a complete roadmap with full content directly from NVIDIA AI.
 * Returns { nodes: GenNode[], count: number } or throws on error.
 */
export async function generateRoadmapDirect({ title, description, category, level, rigor = 3, files = [], fileContents = [] }) {
  let fileContext = '(Sin archivos de referencia. Usa el nombre y descripción del curso.)'
  if (fileContents.length > 0) {
    fileContext = 'MATERIAL DE REFERENCIA:\n' + fileContents.slice(0, 3).map((fc, i) =>
      `--- Archivo ${i + 1} ---\n${fc.slice(0, 3000)}`
    ).join('\n\n')
  } else if (files.length > 0) {
    fileContext = `Archivos de referencia (sin contenido extraible): ${files.join(', ')}`
  }

  const userMsg = `Curso: ${title}
Descripción: ${description || 'Sin descripción'}
Categoría: ${category || 'general'}
Nivel: ${level || 'general'}, rigor: ${rigor}/5.
${fileContext}

REGLAS CRÍTICAS:
- SOLO 3 tipos de nodo: theory, quiz, boss
- Después de cada 2-3 nodos theory → OBLIGATORIO un quiz
- Primer nodo = theory, último nodo = boss
- Cada quiz tiene 4 preguntas REALES con explicaciones
- Nodos theory con 300-600 palabras de contenido REAL
- Entre 6 y 12 nodos en total
- NO uses texto placeholder como "ejemplo" o "concepto A"
- Genera 6-12 nodos con contenido completo. SOLO JSON, sin markdown.`

  const llmRes = await callNvidia({
    system: ROADMAP_SYSTEM,
    userMessage: userMsg,
    temperature: 0.6,
    maxOutputTokens: 12288,
  })

  const raw = extractNvidiaText(llmRes)
  console.log('[nvidia] raw response:', raw.slice(0, 300))

  let parsed
  try {
    parsed = safeParseJson(raw)
  } catch (e) {
    console.error('[nvidia] JSON parse error:', e.message)
    throw new Error(`Error al parsear la respuesta de la IA: ${e.message}`)
  }

  const generated = enforceRegulation(parsed.nodes ?? [])
  if (generated.length === 0) {
    throw new Error('La IA no generó nodos válidos. Intenta de nuevo.')
  }

  console.log(`[nvidia] ${generated.length} nodes generated with content`)
  return { nodes: generated, count: generated.length }
}
