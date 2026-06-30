const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

// ─── Logger ──────────────────────────────────────────────
function log(tag, msg) { console.log(`[${new Date().toISOString().slice(11, 19)}][${tag}] ${msg}`) }
function warn(tag, msg, err) {
  console.warn(`[${new Date().toISOString().slice(11, 19)}][${tag}] ⚠ ${msg}${err?.message ? ': ' + err.message : ''}`)
  if (err?.stack) console.warn(`  Stack: ${err.stack.split('\n').slice(1, 3).join('; ')}`)
}
process.on('uncaughtException', (err) => { warn('FATAL', 'Uncaught', err); process.exit(1) })
process.on('unhandledRejection', (err) => warn('FATAL', 'Rejection', err))

// ─── Env ─────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const PORT = process.env.PORT || process.env.AI_BACKEND_PORT || 3001
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY
if (!NVIDIA_API_KEY) { warn('INIT', 'Falta NVIDIA_API_KEY en .env'); process.exit(1) }
const GROQ_API_KEY = process.env.GROQ_API_KEY

const LLM_MODEL = 'moonshotai/kimi-k2.6'
const LLM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1'

// ─── Express setup ──────────────────────────────────────
const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
app.use(cors({ origin: true }))
app.use(express.json({ limit: '50mb' }))

// ─── Simple API key auth ────────────────────────────────
const API_KEY = process.env.AI_API_KEY || 'eduapp-dev-key'
function authenticate(req, res, next) {
  // Accept X-API-Key header
  const key = req.headers['x-api-key'] || req.query.apiKey
  if (key === API_KEY) return next()
  // Accept Bearer token from frontend (Supabase JWT, trust in dev)
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return next()
  // In dev mode, allow unauthenticated requests
  if (process.env.NODE_ENV !== 'production') return next()
  res.status(401).json({ error: 'API key requerida. Envia x-api-key header.' })
}

// ─── NVIDIA helper ──────────────────────────────────────
async function callNvidia({ system, userMessage, temperature = 0.6, maxTokens = 16384, jsonOnly = false, studentLevel = 'intermediate', retries = 1 }) {
  const levelTemp = studentLevel === 'beginner' ? 0.7 : studentLevel === 'advanced' ? 0.3 : 0.5
  const effectiveTemp = temperature ?? levelTemp

  let formalityHint = ''
  if (studentLevel === 'beginner') {
    formalityHint = '\n\nINSTRUCCIÓN ADICIONAL: El estudiante tiene nivel principiante. Usa lenguaje MUY SIMPLE, como si explicaras a un niño de 10 años. Evita tecnicismos. Usa analogías cotidianas (comida, deportes, videojuegos).'
  } else if (studentLevel === 'advanced') {
    formalityHint = '\n\nINSTRUCCIÓN ADICIONAL: El estudiante tiene nivel avanzado. Usa lenguaje TÉCNICO y PRECISO. Puedes usar terminología especializada del tema.'
  }

  const finalSystem = system + formalityHint

  const messages = []
  if (jsonOnly) messages.push({ role: 'system', content: `Eres un asistente que SOLO responde con JSON valido. NUNCA incluyas texto fuera del JSON. NUNCA uses markdown ni bloques \`\`\`` })
  if (finalSystem) messages.push({ role: 'system', content: finalSystem })
  messages.push({ role: 'user', content: userMessage })

  // 1. Intentar Groq primero (más rápido, sin rate limits agresivos)
  if (GROQ_API_KEY) {
    try {
      log('LLM', 'Intentando con Groq...')
      return await callGroq({ messages, temperature: effectiveTemp, maxTokens })
    } catch (e) {
      warn('LLM', 'Groq falló, intentando con NVIDIA...', e)
    }
  }

  // 2. Fallback a NVIDIA
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_API_KEY}` },
      body: JSON.stringify({ model: LLM_MODEL, messages, temperature: effectiveTemp, max_tokens: maxTokens }),
    })
    if (res.ok) {
      const json = await res.json()
      return json?.choices?.[0]?.message?.content || ''
    }
    if (res.status === 429 && attempt < retries) {
      const waitMs = (attempt + 1) * 1000
      warn('LLM', `NVIDIA rate limited. Reintentando en ${waitMs}ms...`)
      await new Promise(r => setTimeout(r, waitMs))
      continue
    }
    const errBody = await res.text().catch(() => 'unknown')
    throw new Error(`NVIDIA error ${res.status}: ${errBody.slice(0, 300)}`)
  }
  throw new Error('NVIDIA error: Max retries exceeded')
}

// ─── Groq helper (fallback cuando NVIDIA tiene rate limit) ─
async function callGroq({ messages, temperature = 0.6, maxTokens = 2048, model = 'llama-3.3-70b-versatile' }) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY no configurada')

  const res = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown')
    throw new Error(`Groq error ${res.status}: ${errBody.slice(0, 300)}`)
  }
  const json = await res.json()
  return json?.choices?.[0]?.message?.content || ''
}

// ─── PROMPT (tightly coupled with parser) ───────────────
// The parser expects EXACTLY this format. Any deviation fails predictably.
const ROADMAP_PROMPT = `Eres un diseñador instruccional experto. Tu unica funcion es generar roadmaps educativos en formato JSON.

## REGLA ABSOLUTA: SIN ALUCINACIONES
- SOLO puedes usar la informacion del MATERIAL DE REFERENCIA que se te proporciona abajo.
- NUNCA inventes datos, estadisticas, definiciones o ejemplos que no esten en el material.
- Si el material no contiene informacion suficiente para un nodo, escribelo explicitamente en el contenido: "El material de referencia no cubre este tema en detalle."
- NUNCA uses conocimiento general o de tu entrenamiento. Solo el material proporcionado.
- El contenido teorico debe ser parafraseo del material, no texto original inventado.

## FORMATO EXACTO (SOLO JSON, SIN MARKDOWN, SIN TEXTOS ADICIONALES):
{"title":"Nombre exacto del curso","nodes":[
  {"position":1,"type":"theory","title":"Titulo especifico basado en el material","description":"Breve descripcion","content":"<h2>Subtitulo</h2><p>Contenido REAL extraido del material de referencia. 150-250 palabras. Parafrasea el material. NUNCA inventes.</p>"},
  {"position":2,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":3,"type":"quiz","title":"Quiz: Temas especificos del material","description":"Evalua los nodos anteriores","content":"{\\"questions\\":[{\\"id\\":1,\\"text\\":\\"Pregunta EXTRAIDA DIRECTAMENTE del material de referencia?\\",\\"options\\":[\\"Respuesta correcta extraida del material\\",\\"Distractor creible\\",\\"Distractor creible\\",\\"Distractor creible\\"],\\"correct\\":0,\\"explanation\\":\\"Explicacion de 40+ caracteres citando o parafraseando el material.\\"},{\\"id\\":2,\\"text\\":\\"...\\",\\"options\\":[\\"...\\",\\"...\\",\\"...\\",\\"...\\"],\\"correct\\":1,\\"explanation\\":\\"...\\"},{\\"id\\":3,\\"text\\":\\"...\\",\\"options\\":[\\"...\\",\\"...\\",\\"...\\",\\"...\\"],\\"correct\\":2,\\"explanation\\":\\"...\\"},{\\"id\\":4,\\"text\\":\\"...\\",\\"options\\":[\\"...\\",\\"...\\",\\"...\\",\\"...\\"],\\"correct\\":3,\\"explanation\\":\\"...\\"}]}"},
  {"position":4,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":5,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":6,"type":"quiz","title":"Quiz: ...","description":"...","content":"{\\"questions\\":[...4 preguntas...]}"},
  {"position":7,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":8,"type":"boss","title":"Examen Final Integrador","description":"Evaluacion integral del curso","content":"{\\"questions\\":[{\\"id\\":1,\\"text\\":\\"Pregunta integradora basada en el material?\\",\\"options\\":[\\"...\\",\\"...\\",\\"...\\",\\"...\\"],\\"correct\\":0,\\"explanation\\":\\"...\\"},...5 preguntas en total],\\"congratulations\\":\\"Felicitaciones! Has completado exitosamente el curso [nombre].\\"}"}
]}

## REGLA CRITICA — CONTENT DE QUIZ Y BOSS:
- El campo "content" de los nodos quiz y boss DEBE ser un STRING JSON codificado, NUNCA un objeto JSON anidado.
- Las comillas internas DEBEN estar escapadas con \\" (barra invertida + comilla doble).
- Ejemplo CORRECTO: "content":"{\\"questions\\":[...]}"
- Ejemplo INCORRECTO: "content":{"questions":[...]}
- Si escribes content como objeto en vez de string, el sistema lo rechazara y perdera TODO el contenido.
- GRABA ESTO: el valor de "content" empieza y termina con comillas dobles, y dentro lleva JSON escapado.

## ESTRUCTURA:
1. SECUENCIA: theory, theory, quiz, theory, theory, quiz, theory, boss (8 nodos). 10 nodos si hay >15000 chars de material.
2. theory: 150-250 palabras HTML. Contenido parafraseado del material. NO inventes.
3. quiz: EXACTAMENTE 4 preguntas. Cada pregunta debe estar BASADA EN EL MATERIAL.
4. boss: EXACTAMENTE 5 preguntas integradoras + campo "congratulations".
5. Explicaciones: MINIMO 40 caracteres justificando con el material.
6. OPCIONES SIN PREFIJOS: NO incluyas "A) " ni "B) " en las opciones. Solo el texto puro ("Respuesta correcta" no "A) Respuesta correcta").
7. NUNCA uses {"roadmap":[...]}. Siempre {"title":"...","nodes":[...]}
8. NUNCA dejes content null o empty.
9. SOLO el JSON. Sin markdown, sin \`\`\`, sin texto adicional, sin explicaciones.`

// ─── Chat & content generation prompts ──────────────────
const CHAT_SYSTEM = `Eres un tutor educativo experto. Responde las preguntas del estudiante basándote ESTRICTAMENTE en el material de referencia proporcionado.
Si la pregunta no está relacionada con el material, responde amablemente que solo puedes ayudar con el contenido del curso.
Usa un tono amable y educativo. Da ejemplos concretos del material cuando sea posible.
No inventes información que no esté en el material de referencia. Si no sabes la respuesta basada en el material, dilo honestamente.
Mantén las respuestas CONCISAS (máximo 3 párrafos).
NUNCA repitas frases o párrafos. Si ya dijiste algo, no lo vuelvas a decir con otras palabras.
Si la respuesta es breve, TERMINA ahí. No añadas texto de relleno ni advertencias genéricas.
Usa markdown para formatear: separa párrafos con una línea en blanco, usa **negrita** para conceptos clave, y listas con guiones para enumerar puntos.`

const CONTENT_GENERATION_SYSTEM = `Eres un diseñador instruccional experto. Genera una versión alternativa completa de la lección en formato MARKDOWN.
Usa ## para títulos principales, ### para subtítulos, **negrita** para conceptos clave, listas con - para enumerar puntos, y bloques de código con \`\`\`.
Para conceptos importantes, usa este formato exacto:
:::concept
**Nombre del concepto:** Explicación del concepto.
:::
Para ejemplos, usa este formato exacto:
:::example
**Título del ejemplo:** Descripción o código del ejemplo.
:::
Basándote ESTRICTAMENTE en el material de referencia proporcionado. NO inventes contenido que no esté en el material.
El contenido debe ser claro, intuitivo y estar bien organizado con secciones lógicas.
Responde SOLO con el markdown del contenido, sin explicaciones adicionales ni texto fuera del markdown. Sin bloques de código envolventes (\`\`\`markdown).`

// ─── Validate quiz/boss content is parseable JSON ──────
function validateNodeContent(node) {
  if (node.type === 'quiz' || node.type === 'boss') {
    if (!node.content) return false
    // Accept both string (prompt-compliant) and object (AI sometimes deviates)
    if (typeof node.content !== 'string') {
      node.content = JSON.stringify(node.content)
    }
    try {
      const parsed = JSON.parse(node.content)
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return false
      for (const q of parsed.questions) {
        if (!q.text || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct !== 'number' || !q.explanation) return false
      }
      if (node.type === 'boss' && !parsed.congratulations) return false
      return true
    } catch { return false }
  }
  return true // theory nodes don't need JSON validation
}

// ─── Parser (tightly coupled with prompt format) ────────
function extractNodesFromResponse(raw) {
  let s = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/im, '')
    .trim()

  // Try direct parse
  try {
    let r = JSON.parse(s)
    if (r.nodes && Array.isArray(r.nodes)) return { title: r.title || '', nodes: r.nodes }
    if (Array.isArray(r.roadmap)) return { title: r.title || '', nodes: r.roadmap }
    if (r.roadmap?.nodes) return { title: r.roadmap.title || '', nodes: r.roadmap.nodes }
    if (Array.isArray(r)) return { title: '', nodes: r }
  } catch {}

  // Fix trailing commas and retry
  try {
    let r = JSON.parse(s.replace(/,\s*([}\]])/g, '$1'))
    if (r.nodes && Array.isArray(r.nodes)) return { title: r.title || '', nodes: r.nodes }
  } catch {}

  // Extract outermost { ... } using structural brace counting
  const startIdx = s.indexOf('{')
  if (startIdx === -1) throw new Error('No se encontro { en la respuesta')

  let depth = 0, inStr = false, esc = false, endIdx = -1
  for (let i = startIdx; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === '"') { inStr = false; continue }
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === '{') { depth++; continue }
    if (c === '}') {
      depth--
      if (depth === 0) { endIdx = i; break }
      continue
    }
  }

  if (endIdx !== -1) {
    const core = s.slice(startIdx, endIdx + 1)
    try {
      const r = JSON.parse(core)
      if (r.nodes && Array.isArray(r.nodes)) return { title: r.title || '', nodes: r.nodes }
      if (Array.isArray(r.roadmap)) return { title: '', nodes: r.roadmap }
    } catch {}
    try {
      const r = JSON.parse(core.replace(/,\s*([}\]])/g, '$1'))
      if (r.nodes && Array.isArray(r.nodes)) return { title: r.title || '', nodes: r.nodes }
    } catch {}
  }

  // Extract individual nodes from the "nodes" array
  const nodesIdx = s.indexOf('"nodes"')
  if (nodesIdx === -1) throw new Error('No se encontro "nodes" en la respuesta')

  const arrStart = s.indexOf('[', nodesIdx)
  if (arrStart === -1) throw new Error('No se encontro [ despues de "nodes"')

  let extracted = []
  depth = 0; inStr = false; esc = false; let curStart = -1

  for (let i = arrStart; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === '"') { inStr = false; continue }
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === '[') { depth++; continue }
    if (c === ']') {
      depth--
      if (depth === 0) break
      continue
    }
    if (c === '{') {
      if (depth === 1) curStart = i
      depth++
      continue
    }
    if (c === '}') {
      depth--
      if (depth === 1 && curStart !== -1) {
        try {
          const nodeStr = s.slice(curStart, i + 1)
          const node = JSON.parse(nodeStr)
          if (node && typeof node === 'object' && node.type) extracted.push(node)
        } catch {}
        curStart = -1
      }
      continue
    }
  }

  if (extracted.length === 0) throw new Error('No se pudieron extraer nodos de la respuesta')
  log('PARSE', `Extraidos ${extracted.length} nodos individualmente`)
  return { title: '', nodes: extracted }
}

// ─── Routes ─────────────────────────────────────────────
app.post('/api/roadmap', authenticate, async (req, res) => {
  try {
    const { title, description, material = '' } = req.body
    if (!title) return res.status(400).json({ error: 'Falta title' })
    if (!material || material.trim().length < 50) {
      return res.status(400).json({ error: 'Se requiere material de referencia (PDF/DOCX/TXT) para generar el roadmap. Sube archivos con contenido del curso.' })
    }

    const userMsg = `Curso: ${title}${description ? '\nDescripcion: ' + description : ''}\n\nMATERIAL DE REFERENCIA (SOLO USA ESTO, NO INVENTES):\n${material.slice(0, 30000)}\n\nGenera el roadmap. SOLO JSON. SIN markdown. SIN texto adicional.`

    log('ROADMAP', `Generando: "${title}" (${material.length} chars de material)`)

    const raw = await callNvidia({ system: ROADMAP_PROMPT, userMessage: userMsg, temperature: 0.4, maxTokens: 16384, jsonOnly: true })
    log('ROADMAP', `Respuesta: ${raw.length} chars`)

    const result = extractNodesFromResponse(raw)

    // Validate and fix quiz/boss content
    let fixedCount = 0
    for (const node of result.nodes) {
      if (!validateNodeContent(node)) {
        if (node.type === 'quiz') {
          node.content = JSON.stringify({
            questions: [
              { id: 1, text: '¿Cual es el concepto principal explicado en el material?', options: [node.title || 'Concepto principal', 'Opcion incorrecta', 'Opcion incorrecta', 'Opcion incorrecta'], correct: 0, explanation: node.title ? node.title + ' es el tema central abordado.' : 'El material de referencia contiene la respuesta.' },
              { id: 2, text: '¿Que dice el material sobre este tema?', options: ['Respuesta basada en el material', 'Distractor', 'Distractor', 'Distractor'], correct: 0, explanation: 'El material de referencia explica este concepto en detalle.' },
              { id: 3, text: '¿Cual es un ejemplo mencionado en el material?', options: ['Ejemplo del material', 'Distractor', 'Distractor', 'Distractor'], correct: 0, explanation: 'Este ejemplo aparece textual en el material de referencia.' },
              { id: 4, text: '¿Que conclusion presenta el material?', options: ['Conclusion del material', 'Distractor', 'Distractor', 'Distractor'], correct: 0, explanation: 'La conclusion esta directamente extraida del material.' },
            ]
          })
          fixedCount++
        } else if (node.type === 'boss') {
          node.content = JSON.stringify({
            questions: [
              { id: 1, text: '¿Cual es el proposito principal del material?', options: [node.title || 'Proposito principal', 'Opcion incorrecta', 'Opcion incorrecta', 'Opcion incorrecta'], correct: 0, explanation: 'El proposito principal se describe en el material.' },
              { id: 2, text: '¿Que conceptos clave se presentan?', options: ['Concepto del material', 'Distractor', 'Distractor', 'Distractor'], correct: 0, explanation: 'El material describe estos conceptos clave.' },
              { id: 3, text: '¿Cual es la relacion entre los temas?', options: ['Relacion descrita en el material', 'Distractor', 'Distractor', 'Distractor'], correct: 0, explanation: 'La relacion se explica en el material de referencia.' },
              { id: 4, text: '¿Que aplicacion practica menciona el material?', options: ['Aplicacion del material', 'Distractor', 'Distractor', 'Distractor'], correct: 0, explanation: 'Esta aplicacion practica aparece en el material.' },
              { id: 5, text: '¿Cual es la idea principal del material?', options: ['Idea principal del material', 'Distractor', 'Distractor', 'Distractor'], correct: 0, explanation: 'La idea principal esta claramente expresada en el material.' },
            ],
            congratulations: `Felicitaciones! Has completado exitosamente "${title || 'el curso'}".`
          })
          fixedCount++
        }
      }
    }
    if (fixedCount > 0) log('ROADMAP', `${fixedCount} nodos corregidos (contenido no valido reemplazado)`)

    log('ROADMAP', `${result.nodes.length} nodos extraidos`)
    res.json(result)
  } catch (err) {
    warn('ROADMAP', 'Error', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/ask', authenticate, async (req, res) => {
  try {
    const { question, context = '', history = [] } = req.body
    if (!question) return res.status(400).json({ error: 'Falta question' })

    const system = `Eres un tutor educativo. SOLO responde basado en el contexto proporcionado. NUNCA inventes informacion. Si no sabes, di "No encuentro esta informacion en el material."`

    const ctx = context ? `Contexto:\n${context.slice(0, 10000)}` : ''
    const hist = history.filter(m => m.text).slice(-6).map(m => `${m.role}: ${m.text}`).join('\n')
    const userMsg = `${ctx}\n\n${hist ? 'Historial:\n' + hist + '\n\n' : ''}Pregunta: ${question}`

    const answer = await callNvidia({ system, userMessage: userMsg, temperature: 0.3, maxTokens: 2048 })
    res.json({ answer })
  } catch (err) {
    warn('ASK', 'Error', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── Stream answer (for Lesson.jsx chat UX) ─────────────
app.post('/api/ask-stream', authenticate, async (req, res) => {
  try {
    const { question, courseTitle, fileTexts = [], history = [], contentMode = false, studentLevel = 'intermediate' } = req.body
    if (!question) return res.status(400).json({ error: 'Falta question' })

    const joined = fileTexts.map(f => (typeof f === 'object' && f.text) ? f.text : (typeof f === 'string' ? f : '')).filter(Boolean)
    let context = `Curso: ${courseTitle || 'Sin especificar'}`
    if (joined.length > 0) {
      context += '\n\nMATERIAL DE REFERENCIA DEL CURSO:\n' + joined.slice(0, 5).map((t, i) =>
        `--- Material ${i + 1} ---\n${t.slice(0, 5000)}`
      ).join('\n\n')
    }

    const hist = history.filter(m => m.text && m.text.trim()).slice(-6)
      .map(m => `${m.role === 'student' ? 'Estudiante' : 'Tutor'}: ${m.text}`).join('\n')
    const historyText = hist ? '\n\nHistorial:\n' + hist : ''

    const systemPrompt = contentMode ? CONTENT_GENERATION_SYSTEM : CHAT_SYSTEM
    const suffix = contentMode ? '\n\nGenera una versión alternativa completa de esta lección en markdown.' : ''
    const userMsg = `${context}${historyText}\n\nPregunta: ${question}${suffix}\n\nResponde basándote ESTRICTAMENTE en el material. Sé conciso y educativo.`

    const answer = await callNvidia({ system: systemPrompt, userMessage: userMsg, temperature: 0.4, maxTokens: contentMode ? 4096 : 2048, studentLevel })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const words = answer.split(' ')
    for (let i = 0; i < words.length; i++) {
      res.write(`data: ${JSON.stringify({ text: words[i] + (i < words.length - 1 ? ' ' : '') })}\n\n`)
      await new Promise(r => setTimeout(r, 30))
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    warn('ASK-STREAM', 'Error', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
})

app.post('/api/quiz', authenticate, async (req, res) => {
  try {
    const { material = '', count = 4, topic = '' } = req.body
    if (!material || material.trim().length < 50) {
      return res.status(400).json({ error: 'Se requiere material de referencia.' })
    }

    const system = `Genera un quiz en JSON basado SOLO en el material. FORMATO:
{"questions":[{"id":1,"text":"Pregunta?","options":["A) Correcta","B) Distractor","C) Distractor","D) Distractor"],"correct":0,"explanation":"Por que?"}]}
Cada pregunta sobre el material. NUNCA inventes. Explicacion 40+ caracteres.`

    const userMsg = `${topic ? 'Tema: ' + topic + '\n' : ''}Material:\n${material.slice(0, 8000)}\n\nGenera ${count} preguntas. SOLO JSON.`

    const raw = await callNvidia({ system, userMessage: userMsg, temperature: 0.4, maxTokens: 4096 })
    const cleaned = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
    const result = JSON.parse(cleaned)
    res.json({ quiz: result.questions || result.quiz || result })
  } catch (err) {
    warn('QUIZ', 'Error', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: LLM_MODEL, hasKey: !!NVIDIA_API_KEY, groqConfigured: !!GROQ_API_KEY })
})

// ─── Analyze quiz error (for Review.jsx quiz review) ────
app.post('/api/analyze-error', authenticate, async (req, res) => {
  try {
    const { question, userAnswer, correctAnswer, concept, studentLevel = 'intermediate' } = req.body
    if (!question || !correctAnswer) return res.status(400).json({ error: 'Falta question o correctAnswer' })

    const systemPrompt = `Eres un tutor paciente que habla EXCLUSIVAMENTE en español. Analiza por qué el estudiante se equivocó.
Reglas ESTRICTAS:
- Identifica el concepto detrás de la pregunta.
- Compara la respuesta del estudiante con la correcta.
- Explica en UNA sola frase (máximo 30 palabras), en español latinoamericano, sin tecnicismos innecesarios.
- NUNCA respondas en chino, inglés u otro idioma. SOLO español.
- Devuelve SOLO la frase, sin comillas, sin formato JSON, sin markdown.`

    const formalityHint = studentLevel === 'beginner'
      ? '\n\nINSTRUCCIÓN ADICIONAL: El estudiante tiene nivel principiante. Usa lenguaje MUY SIMPLE, como si explicaras a un niño de 10 años.'
      : studentLevel === 'advanced'
        ? '\n\nINSTRUCCIÓN ADICIONAL: El estudiante tiene nivel avanzado. Usa lenguaje TÉCNICO y PRECISO.'
        : ''

    const userMsg = `Concepto: ${concept || 'general'}\nPregunta: ${question}\nRespuesta del estudiante: ${userAnswer || '(sin respuesta)'}\nRespuesta correcta: ${correctAnswer}${formalityHint}`

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    log('ANALYZE-ERROR', `Analizando: "${question.slice(0, 50)}..." nivel=${studentLevel}`)

    const answer = await callNvidia({ system: systemPrompt, userMessage: userMsg, temperature: 0.5, maxTokens: 256, studentLevel, retries: 1 })

    const words = answer.split(' ')
    for (let i = 0; i < words.length; i++) {
      res.write(`data: ${JSON.stringify({ text: words[i] + (i < words.length - 1 ? ' ' : '') })}\n\n`)
      await new Promise(r => setTimeout(r, 20))
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    warn('ANALYZE-ERROR', 'Error', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
})

// ─── Batch analyze errors (multiple questions, single LLM call) ──
const batchCache = new Map()
const pendingBatch = new Map()

async function processBatch(errors, studentLevel) {
  const formalityHint = studentLevel === 'beginner'
    ? 'El estudiante tiene nivel principiante. Usa lenguaje MUY SIMPLE, como si explicaras a un niño de 10 años.'
    : studentLevel === 'advanced'
      ? 'El estudiante tiene nivel avanzado. Usa lenguaje TÉCNICO y PRECISO.'
      : 'Usa un lenguaje claro con ejemplos prácticos.'

  const errorsBlock = errors.map((e, i) => {
    const concept = e.question?.split(' ').slice(0, 4).join(' ') || 'general'
    return `--- Error ${i + 1} ---
Concepto: ${concept}
Pregunta: ${e.question}
Respuesta del estudiante: ${e.userAnswer || '(sin respuesta)'}
Respuesta correcta: ${e.correctAnswer}`
  }).join('\n\n')

  const systemPrompt = `Eres un tutor paciente que habla EXCLUSIVAMENTE en español. Analiza por qué el estudiante se equivocó en cada pregunta.
Reglas ESTRICTAS:
- Para CADA error, escribe UNA sola frase (máximo 30 palabras).
- Identifica el concepto y compara la respuesta del estudiante con la correcta.
- En español latinoamericano, sin tecnicismos innecesarios.
- NUNCA respondas en chino, inglés u otro idioma. SOLO español.
- ${formalityHint}

Devuelve SOLO un array JSON con las explicaciones, una por cada error, en orden. Ejemplo: ["Explicación 1", "Explicación 2"]
NO incluyas texto fuera del array. NO uses markdown. SOLO el array JSON.`

  const userMsg = `El estudiante cometió ${errors.length} error(es):\n\n${errorsBlock}\n\nDevuelve el array JSON con las explicaciones.`

  log('ANALYZE-ERRORS-BATCH', `Analizando ${errors.length} errores nivel=${studentLevel}`)

  const raw = await callNvidia({ system: systemPrompt, userMessage: userMsg, temperature: 0.5, maxTokens: 1024, studentLevel, retries: 1 })

  const cleaned = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
  let explanations
  try {
    explanations = JSON.parse(cleaned)
    if (!Array.isArray(explanations)) explanations = [cleaned]
  } catch {
    explanations = errors.map(() => cleaned || 'Revisa el material de clase para entender mejor este concepto.')
  }

  while (explanations.length < errors.length) {
    explanations.push('La IA analizó tu error. Revisa el concepto nuevamente.')
  }

  log('ANALYZE-ERRORS-BATCH', `${explanations.length} explicaciones generadas`)
  return explanations.slice(0, errors.length)
}

app.post('/api/analyze-errors-batch', authenticate, async (req, res) => {
  try {
    const { errors, studentLevel = 'intermediate' } = req.body
    if (!Array.isArray(errors) || errors.length === 0) return res.status(400).json({ error: 'Falta array errors' })

    const cacheKey = JSON.stringify(errors.map(e => e.question).sort()) + '|' + studentLevel

    // 1. Si ya está completado y es reciente → retorna cache
    const cached = batchCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < 15000) {
      log('ANALYZE-ERRORS-BATCH', `Cache hit, reusing ${cached.data.length} explicaciones`)
      return res.json({ explanations: cached.data })
    }

    // 2. Si ya hay una petición igual en vuelo → ESPERA su resultado
    if (pendingBatch.has(cacheKey)) {
      log('ANALYZE-ERRORS-BATCH', 'Waiting for pending request')
      const result = await pendingBatch.get(cacheKey)
      return res.json({ explanations: result })
    }

    // 3. Primera petición → ejecuta y guarda en pending
    const promise = processBatch(errors, studentLevel)
      .then(result => {
        batchCache.set(cacheKey, { data: result, ts: Date.now() })
        if (batchCache.size > 50) {
          const oldest = batchCache.keys().next().value
          batchCache.delete(oldest)
        }
        return result
      })
      .finally(() => {
        pendingBatch.delete(cacheKey)
      })

    pendingBatch.set(cacheKey, promise)
    const result = await promise
    res.json({ explanations: result })
  } catch (err) {
    warn('ANALYZE-ERRORS-BATCH', 'Error', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── Voice endpoints (Groq STT + categorization) ────────
app.post('/api/voice/transcribe', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!GROQ_API_KEY) return res.status(503).json({ error: 'Groq API no configurada' })
    if (!req.file) return res.status(400).json({ error: 'No se recibió audio' })
    const formData = new FormData()
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), 'audio.webm')
    formData.append('model', 'whisper-large-v3')
    formData.append('language', 'es')
    const groqRes = await fetch(`${GROQ_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    })
    if (!groqRes.ok) {
      const err = await groqRes.text().catch(() => 'unknown')
      throw new Error(`Groq STT error ${groqRes.status}: ${err.slice(0, 200)}`)
    }
    const data = await groqRes.json()
    log('VOICE', `Transcripcion: "${data.text?.slice(0, 80)}"`)
    res.json({ text: data.text || '', language: data.language || 'es' })
  } catch (err) {
    warn('VOICE-STT', 'Error', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/voice/categorize', authenticate, async (req, res) => {
  try {
    const { transcript, context = {} } = req.body
    if (!transcript) return res.status(400).json({ error: 'Falta transcript' })
    if (!GROQ_API_KEY) return res.status(503).json({ error: 'Groq API no configurada' })

    const systemPrompt = `Eres un clasificador de comandos de voz para una plataforma educativa en español. El usuario es un estudiante con discapacidad visual. Clasifica en UNA categoría y acción.

CATEGORÍAS Y ACCIONES DISPONIBLES:

1. "navigate" - Navegación:
   goToDashboard, goToAchievements, goToExplore, goToProfile, goToSettings, goToColiseo, goBack,
   goToCourseRoadmap (params.courseName), goToLastNode (params.courseName),
   goToLastAvailableNode (params.courseName - ir al último nodo pendiente de un curso),
   goToNextNode, goToPrevNode
   Ej: "llévame a configuración"->goToSettings, "último nodo pendiente de Python"->goToLastAvailableNode

2. "quiz_answer" - Seleccionar respuesta en quiz:
   selectOptionA, selectOptionB, selectOptionC, selectOptionD
   Ej: "opción B", "la A", "seleccionar C"

3. "quiz_action" - Acciones dentro del quiz (no seleccionar, solo leer/informar):
   readQuestion (leer la pregunta actual), readOptions (leer alternativas), markAnswer (marcar una respuesta, params.answer: "A"/"B"/"C"/"D"/"primera"/"segunda")
   Ej: "leer la pregunta"->readQuestion, "alternativas"->readOptions, "marco la B"->markAnswer

4. "lesson_action" - Acciones en lección:
   finishNode, openChat, closeChat, readContent (leer el contenido de la lección)
   Ej: "terminar nodo"->finishNode, "leer la lección"->readContent

5. "result_action" - Resultados de quiz:
   nextNode, reviewErrors, retryQuiz

6. "review_action" - Revisión de errores:
   understood, dontUnderstand

7. "coliseo_action" - Coliseo:
   enterArena, exitColiseo, retryColiseo

8. "system_action" - Sistema:
   readScreen, repeat, help, whereAmI, listCourses,
   readNotifications (leer notificaciones en voz alta),
   listAchievements (decir qué logros tengo, NO redirigir),
   nodeCount (cuántos nodos completados/totales),
   nodeProgress (en qué nodo voy)
   Ej: "leer notificaciones"->readNotifications, "qué logros tengo"->listAchievements, "cuántos nodos tengo"->nodeCount

9. "question" - Pregunta académica (no es acción):
   answerQuestion

CONTEXTO:
Pantalla: ${context.page || '?'}
${context.courseTitle ? 'Curso: ' + context.courseTitle : ''}
${context.nodeTitle ? 'Nodo: ' + context.nodeTitle : ''}
${context.courses?.length ? 'Cursos: ' + context.courses.join(', ') : ''}
${context.options?.length ? 'Opciones: ' + context.options.join(', ') : ''}
${context.nodePosition != null ? 'Progreso: nodo ' + context.nodePosition + '/' + (context.totalNodes || '?') : ''}

REGLAS CRÍTICAS:
- "leer notificaciones" SIEMPRE es readNotifications (system_action)
- "qué logros tengo" / "mis medallas" SIEMPRE es listAchievements (system_action)
- "cuántos nodos tengo" / "progreso del curso" SIEMPRE es nodeCount (system_action)
- "último nodo disponible" / "último nodo pendiente" / "continuar" SIEMPRE es goToLastAvailableNode (navigate)
- "qué opciones tengo" / "qué puedo hacer" / "qué acciones hay aquí" / "opciones disponibles":
  SI en quiz (página=quiz) -> readOptions (quiz_action)
  SI en otra página -> help (system_action)
- "qué dice la pregunta" / "lee la pregunta" -> readQuestion (quiz_action)
- "alternativas" en quiz -> readOptions (quiz_action)
- "marco la X" / "creo que es la X" -> markAnswer (quiz_action) con params.answer
- NO uses navigate cuando el usuario pregunta por información (notificaciones, logros, progreso)
- responseText: 1 frase breve en español, tono amable

Responde SOLO JSON: {"category":"...","action":"...","params":{},"responseText":"..."}`

    const userMsg = `Transcript: "${transcript}"\n\nClasifica esta intencion. SOLO JSON.`

    const groqRes = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], temperature: 0.1, max_tokens: 512 }),
    })
    if (!groqRes.ok) {
      const err = await groqRes.text().catch(() => 'unknown')
      throw new Error(`Groq categorize error ${groqRes.status}: ${err.slice(0, 200)}`)
    }
    const data = await groqRes.json()
    const raw = data?.choices?.[0]?.message?.content || '{}'
    let parsed
    try {
      parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim())
    } catch {
      parsed = { category: 'question', action: 'answerQuestion', params: {}, responseText: 'No entendi bien. Puedes repetir?' }
    }
    log('VOICE', `Categoria: ${parsed.category} | Accion: ${parsed.action}`)
    res.json(parsed)
  } catch (err) {
    warn('VOICE-CAT', 'Error', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/voice/ask', authenticate, async (req, res) => {
  try {
    const { question, context = '' } = req.body
    if (!question) return res.status(400).json({ error: 'Falta question' })

    const system = `Eres un tutor educativo. Responde de forma CONCISA (max 3 oraciones) en español.
Basate en el contexto si existe. Habla claro, como si le explicaras a alguien que no puede ver la pantalla.
NO uses markdown, NO uses emojis, NO uses formato especial. Solo texto plano hablado.`

    const userMsg = context ? `Contexto: ${context.slice(0, 2000)}\n\nPregunta: ${question}` : `Pregunta: ${question}`
    const answer = await callNvidia({ system, userMessage: userMsg, temperature: 0.3, maxTokens: 512 })
    res.json({ answer })
  } catch (err) {
    warn('VOICE-ASK', 'Error', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  log(`\n  EduApp AI Backend (sin Supabase)`)
  log(`  http://localhost:${PORT}`)
  log(`  Modelo: ${LLM_MODEL}`)
  log(`  Auth: ${process.env.NODE_ENV === 'production' ? 'API key' : 'deshabilitado (dev)'}`)
  log(`  Material requerido: SI (min 50 chars)\n`)
})
