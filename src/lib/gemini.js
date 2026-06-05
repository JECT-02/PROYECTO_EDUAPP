// src/lib/gemini.js
// Direct Gemini API calls from the frontend (no Supabase Edge Function proxy)
// NOTE: VITE_GEMINI_API_KEY must be set in .env for this to work.

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const ROADMAP_SYSTEM = `Eres un diseñador instruccional experto. Tu tarea es generar un roadmap COMPLETO de aprendizaje en formato JSON. Cada nodo debe incluir TANTO su estructura (título, tipo, posición) COMO su contenido educativo completo.

El roadmap organiza el curso en una secuencia pedagógica de 8 a 15 nodos.

TIPOS DE NODO:
- "theory": Lección teórica (60% del roadmap). CONTENIDO: HTML completo con <h2>, <p>, <div class="example-box">, <ul>/<li>, <strong> para términos clave. 400-800 palabras.
- "practice": Ejercicio práctico (25%). CONTENIDO: HTML con <h2>, <p> instrucciones paso a paso, <div class="exercise-box"> para enunciado, <pre><code> para ejemplos, <p class="hint"> para pista. 200-500 palabras.
- "quiz": Evaluación corta (máx 1 cada 3 nodos). CONTENIDO: JSON string con formato {"questions":[{"id":1,"text":"...","options":["A)","B)","C)","D)"],"correct":0,"explanation":"..."}]}. 4 preguntas, cada una con 4 opciones.
- "boss": Examen final integrador (siempre el último nodo). CONTENIDO: JSON string con formato {"title":"...","questions":[{"id":1,"text":"...","options":["A)","B)","C)","D)"],"correct":0,"explanation":"..."}]}. 10 preguntas variadas.
- "reward": Reconocimiento (0 o 1, opcional). CONTENIDO: HTML simple <div class="reward-box"><h2>🏆 Título</h2><p>Mensaje motivacional</p></div>

REGLAS ESTRICTAS:
1. El primer nodo SIEMPRE debe ser "theory" (introducción/bienvenida)
2. El último nodo SIEMPRE debe ser "boss" (examen final)
3. Máximo 1 nodo "quiz" cada 3 nodos que no sean quiz
4. Entre 8 y 15 nodos en total
5. Títulos en español latino neutro, máx 60 caracteres
6. Descripciones concisas, máx 200 caracteres
7. Las posiciones deben ser secuenciales (1, 2, 3...)

FORMATO DE RESPUESTA (SOLO JSON, sin markdown ni explicaciones adicionales):
{
  "title": "Nombre del curso",
  "nodes": [
    {
      "position": 1,
      "type": "theory",
      "title": "Introducción a [tema]",
      "description": "Conceptos fundamentales sobre...",
      "content": "<h2>Subtítulo</h2><p>Contenido completo de la lección en HTML...</p>"
    },
    {
      "position": 2,
      "type": "quiz",
      "title": "Quiz de conceptos básicos",
      "description": "Evalúa tu comprensión de los fundamentos",
      "content": "{\\\"questions\\\":[{\\\"id\\\":1,\\\"text\\\":\\\"¿Pregunta?\\\",\\\"options\\\":[\\\"A) Opción A\\\",\\\"B) Opción B\\\",\\\"C) Opción C\\\",\\\"D) Opción D\\\"],\\\"correct\\\":1,\\\"explanation\\\":\\\"Explicación corta\\\"}]}"
    }
  ]
}

IMPORTANTE: El campo "content" debe contener el contenido COMPLETO del nodo. Para theory y practice: HTML. Para quiz y boss: JSON string escapado. Para reward: HTML simple.
USA EL MATERIAL DE REFERENCIA proporcionado para crear contenido relevante y específico. NO generes contenido genérico.`

/**
 * Call Gemini API directly from the browser.
 * Returns the parsed JSON response from Gemini.
 */
async function callGemini({ system, userMessage, temperature = 0.6, maxOutputTokens = 16384, json = false }) {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY no está configurado en .env')
  }

  const url = `${GEMINI_URL}?key=${GEMINI_API_KEY}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  }
  if (system) body.systemInstruction = { parts: [{ text: system }] }
  if (json) body.generationConfig.responseMimeType = 'application/json'

  console.log(`[gemini] calling ${GEMINI_MODEL} directly, tokens_max=${maxOutputTokens}`)
  const start = Date.now()

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const elapsed = Date.now() - start
  console.log(`[gemini] response: status=${res.status} elapsed=${elapsed}ms`)

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown')
    console.error(`[gemini] error: ${res.status}`, errBody.slice(0, 300))
    throw new Error(`Error de Gemini (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const jsonRes = await res.json()
  return jsonRes
}

/**
 * Extract the text content from a Gemini API response.
 */
function extractGeminiText(jsonRes) {
  return jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * Extrae y parsea JSON de la respuesta cruda de la IA.
 * Prueba múltiples estrategias: directo, sin fences, extraer {}, reparar.
 */
function safeParseJson(raw) {
  if (!raw || raw === '{}') throw new Error('Respuesta vacía')

  // 1. Normalizar escapes literales
  let s = raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')

  // 2. Quitar bloques markdown
  s = s.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()

  // 3. Extraer objeto JSON más externo { ... }
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1)
  }

  // Helper: intenta parsear + doble parse si es string
  function attempt(text) {
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
  if (d1) return d1

  // 5. Eliminar comas finales en bucle hasta estabilizar
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

  // 6. Fallback: solo normalizar sin tocar contenido HTML
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

const ALLOWED_TYPES = new Set(['theory', 'practice', 'quiz', 'boss', 'reward'])

/**
 * Enforce roadmap regulation rules.
 */
function enforceRegulation(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes
  const sorted = [...nodes].sort((a, b) => (a.position || 0) - (b.position || 0))
  for (const n of sorted) {
    if (!ALLOWED_TYPES.has(n.type)) n.type = 'theory'
  }
  // First node must be theory
  if (sorted[0].type !== 'theory') {
    sorted[0] = { ...sorted[0], type: 'theory', title: sorted[0].title || 'Bienvenida' }
  }
  // Last node must be boss
  const lastIdx = sorted.length - 1
  if (sorted[lastIdx].type !== 'boss') {
    sorted.push({
      title: 'Examen final',
      type: 'boss',
      description: 'Desafío final integrador del curso.',
      position: lastIdx + 2,
    })
  } else {
    sorted[lastIdx].type = 'boss'
  }
  // Max 1 quiz every 3 non-quiz nodes
  let lastQuizPos = -10
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === 'quiz') {
      if (i - lastQuizPos < 3) {
        sorted[i] = { ...sorted[i], type: 'practice' }
      } else {
        lastQuizPos = i
      }
    }
  }
  return sorted.map((n, i) => ({ ...n, position: i + 1 }))
}

/**
 * Generate a complete roadmap with full content directly from Gemini.
 * Returns { nodes: GenNode[], count: number } or throws on error.
 */
export async function generateRoadmapDirect({ title, description, category, level, rigor = 3, files = [] }) {
  const fileContext = files.length > 0
    ? `Archivos de referencia: ${files.join(', ')}`
    : '(Sin archivos de referencia. Usa el nombre y descripción del curso.)'

  const userMsg = `Curso: ${title}
Descripción: ${description || 'Sin descripción'}
Categoría: ${category || 'general'}
Nivel: ${level || 'general'}, rigor: ${rigor}/5.
${fileContext}

IMPORTANTE: Genera entre 8 y 15 nodos con contenido COMPLETO. Sigue las reglas del system prompt.
RESPONDE ÚNICAMENTE CON EL JSON. SIN markdown, SIN texto adicional, SIN \`\`\` ni \`\`\`json. SOLO el objeto JSON.`

  const llmRes = await callGemini({
    system: ROADMAP_SYSTEM,
    userMessage: userMsg,
    temperature: 0.6,
    maxOutputTokens: 16384,
  })

  const raw = extractGeminiText(llmRes)
  console.log('[gemini] raw response:', raw.slice(0, 300))

  let parsed
  try {
    parsed = safeParseJson(raw)
  } catch (e) {
    console.error('[gemini] JSON parse error:', e.message)
    throw new Error(`Error al parsear la respuesta de la IA: ${e.message}`)
  }

  const generated = enforceRegulation(parsed.nodes ?? [])
  if (generated.length === 0) {
    throw new Error('La IA no generó nodos válidos. Intenta de nuevo.')
  }

  console.log(`[gemini] ${generated.length} nodes generated with content`)
  return { nodes: generated, count: generated.length }
}


