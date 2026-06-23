const express = require('express')
const cors = require('cors')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// ─── Logger con timestamp ────────────────────────────────────
function log(tag, msg, data) {
  const ts = new Date().toISOString().slice(11, 19)
  const extra = data ? ` ${typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200)}` : ''
  console.log(`[${ts}][${tag}] ${msg}${extra}`)
}
function warn(tag, msg, err) {
  const ts = new Date().toISOString().slice(11, 19)
  console.warn(`[${ts}][${tag}] ⚠ ${msg}${err?.message ? ': ' + err.message : ''}`)
  if (err?.stack) console.warn(`[${ts}][${tag}] Stack: ${err.stack.split('\n').slice(1, 3).join('; ')}`)
}

process.on('uncaughtException', (err) => { warn('FATAL', 'Uncaught exception', err); process.exit(1) })
process.on('unhandledRejection', (err) => warn('FATAL', 'Unhandled rejection', err))

// Load .env from parent directory
const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const PORT = process.env.AI_BACKEND_PORT || 3001
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!NVIDIA_API_KEY) { warn('INIT', 'Falta NVIDIA_API_KEY en .env'); process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { warn('INIT', 'Faltan credenciales Supabase en .env'); process.exit(1) }

const LLM_MODEL = 'moonshotai/kimi-k2.6'
const LLM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

app.use(cors({ origin: true }))
app.use(express.json({ limit: '50mb' }))

// ─── Auth middleware ─────────────────────────────────────────
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' })
  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Token inválido o expirado' })
  req.user = user
  next()
}

// ─── NVIDIA helper ───────────────────────────────────────────
async function callNvidia({ system, userMessage, temperature = 0.6, maxTokens = 8192, frequencyPenalty = 0.3, presencePenalty = 0.2 }) {
  const messages = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: userMessage })

  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_API_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, messages, temperature, max_tokens: maxTokens, frequency_penalty: frequencyPenalty, presence_penalty: presencePenalty }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown')
    throw new Error(`NVIDIA error ${res.status}: ${errBody.slice(0, 300)}`)
  }
  const json = await res.json()
  return json?.choices?.[0]?.message?.content || ''
}

function safeParseJson(raw) {
  if (!raw || raw === '{}') throw new Error('Respuesta vacía')
  let s = raw.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"')
  s = s.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) s = s.slice(firstBrace, lastBrace + 1)
  function attempt(text) { try { const r = JSON.parse(text); if (typeof r === 'string' && r.trim().startsWith('{')) { try { return JSON.parse(r) } catch {} }; return r } catch { return null } }
  const d1 = attempt(s)
  if (d1) { if (d1.roadmap && Array.isArray(d1.roadmap.nodes)) return d1.roadmap; return d1 }
  let prev = ''; let cleaned = s
  while (cleaned !== prev) { prev = cleaned; cleaned = cleaned.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/gm, '') }
  const d2 = attempt(cleaned); if (d2) return d2
  try {
    const fb = raw.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '')
    const f1 = fb.indexOf('{'); const f2 = fb.lastIndexOf('}')
    const core = f1 !== -1 && f2 > f1 ? fb.slice(f1, f2 + 1) : fb
    const fixed = core.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/gm, '')
    const r3 = attempt(fixed); if (r3) return r3
  } catch {}
  throw new Error(`No se pudo extraer JSON de la respuesta de IA`)
}

// ─── Prompts ─────────────────────────────────────────────────
const ROADMAP_SYSTEM = `Eres un diseñador instruccional experto. Genera un roadmap de aprendizaje en formato JSON. Cada nodo incluye estructura Y contenido educativo completo.
El roadmap tiene entre 5 y 10 nodos en secuencia pedagógica.
TIPOS DE NODO:
- "theory": Lección teórica. CONTENIDO: HTML con <h2>, <p>, <strong>, <ul>/<li>. 200-400 palabras.
- "practice": Ejercicio práctico. CONTENIDO: HTML con <h2>, <p>, <div class="exercise-box">, opcional <pre><code>. 100-300 palabras.
- "quiz": Evaluación corta (máx 1 cada 3 nodos). CONTENIDO: JSON string con preguntas. 3 preguntas.
- "boss": Examen final (siempre el último). CONTENIDO: JSON string con preguntas. 5 preguntas.
- "reward": Reconocimiento (0 o 1, opcional). CONTENIDO: HTML simple.
REGLAS:
1. Primer nodo = "theory" (introducción). 2. Último nodo = "boss" (examen final). 3. Máx 1 quiz cada 3 nodos. 4. 5-10 nodos en total.
RESPONDE SOLO CON JSON. Sin markdown, sin texto adicional.
USA EL MATERIAL DE REFERENCIA para contenido relevante y específico. NO contenido genérico.`

const QUIZ_SYSTEM = `Eres un examinador experto. Genera un quiz en formato JSON basado ESTRICTAMENTE en el material proporcionado.
Cada pregunta debe estar directamente relacionada con el contenido del material de referencia.
Formato: {"title":"...","questions":[{"id":1,"text":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]}
RESPONDE SOLO CON JSON. Sin markdown.`

const CHAT_SYSTEM = `Eres un tutor educativo experto. Responde las preguntas del estudiante basándote ESTRICTAMENTE en el material de referencia proporcionado.
Si la pregunta no está relacionada con el material, responde amablemente que solo puedes ayudar con el contenido del curso.
Usa un tono amable y educativo. Da ejemplos concretos del material cuando sea posible.
No inventes información que no esté en el material de referencia. Si no sabes la respuesta basada en el material, dilo honestamente.
Mantén las respuestas CONCISAS (máximo 3 párrafos).
NUNCA repitas frases o párrafos. Si ya dijiste algo, no lo vuelvas a decir con otras palabras.
Si la respuesta es breve, TERMINA ahí. No añadas texto de relleno ni advertencias genéricas.
Usa markdown para formatear: separa párrafos con una línea en blanco, usa **negrita** para conceptos clave, y listas con guiones para enumerar puntos.`

const CONTENT_GENERATION_SYSTEM = `Eres un diseñador instruccional experto. Genera una versión alternativa completa y bien formateada de la lección.
El contenido debe estar en formato HTML válido usando: <h2> para títulos, <p> para párrafos, <strong> para conceptos clave, <ul>/<li> para listas, <div class="key-concept"> para conceptos importantes, y <div class="example-box"> para ejemplos.
Basándote ESTRICTAMENTE en el material de referencia proporcionado. NO inventes contenido que no esté en el material.
El contenido debe ser claro, intuitivo y estar bien organizado con secciones lógicas.
Responde SOLO con el HTML del contenido, sin explicaciones adicionales ni texto fuera del HTML.`

// ─── 1. Extract text from file ───────────────────────────────
app.post('/api/extract', authenticate, upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No se envió ningún archivo' })

    let text = ''
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')

    if (isPdf) {
      const data = await pdfParse(file.buffer)
      text = data.text || ''
    } else {
      text = file.buffer.toString('utf-8')
    }

    if (!text || text.trim().length < 20) {
      return res.status(422).json({ error: 'No se pudo extraer contenido significativo del archivo', text: text || '' })
    }

    res.json({ text: text.trim(), filename: file.originalname, chars: text.trim().length })
  } catch (err) {
    warn('EXTRACT', 'error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 2. Generate roadmap ─────────────────────────────────────
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

function enforceRegulation(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes
  const sorted = [...nodes].sort((a, b) => (a.position || 0) - (b.position || 0))
  for (const n of sorted) { if (!ALLOWED_TYPES.has(n.type)) n.type = 'theory' }
  if (sorted[0].type !== 'theory') { sorted[0] = { ...sorted[0], type: 'theory', title: sorted[0].title || 'Bienvenida', content: sorted[0].content || '<h2>Bienvenida</h2><p>Comienza tu viaje de aprendizaje.</p>' } }
  const lastIdx = sorted.length - 1
  if (sorted[lastIdx].type !== 'boss') {
    sorted.push({ title: 'Examen final', type: 'boss', description: 'Desafío final integrador del curso.', position: lastIdx + 2, content: DEFAULT_BOSS_CONTENT })
  } else {
    sorted[lastIdx].type = 'boss'
    if (!sorted[lastIdx].content) sorted[lastIdx].content = DEFAULT_BOSS_CONTENT
  }
  let lastQuizPos = -10
  for (let i = 0; i < sorted.length; i++) {
    // Auto-generate description from title if missing
    if (!sorted[i].description && sorted[i].title) {
      sorted[i].description = sorted[i].title
    }
    if (sorted[i].type === 'quiz') { if (i - lastQuizPos < 3) { sorted[i] = { ...sorted[i], type: 'practice' } } else { lastQuizPos = i } }
    if (!sorted[i].content && sorted[i].type !== 'reward') {
      sorted[i] = { ...sorted[i], content: sorted[i].type === 'quiz' ? JSON.stringify({ questions: [{ id: 1, text: '¿Pregunta de ejemplo?', options: ['A) Opción A', 'B) Opción B', 'C) Opción C', 'D) Opción D'], correct: 0, explanation: 'Explicación' }] }) : `<h2>${sorted[i].title}</h2><p>${sorted[i].description || 'Contenido de esta lección.'}</p><p>Puedes editar este contenido o regenerarlo usando el asistente IA.</p>` }
    }
  }
  return sorted.map((n, i) => ({ ...n, position: i + 1 }))
}

app.post('/api/roadmap', authenticate, async (req, res) => {
  try {
    const { title, description, category, level, rigor = 3, fileTexts = [] } = req.body
    if (!title) return res.status(400).json({ error: 'Falta el título del curso' })

    let fileContext = '(Sin archivos de referencia. Usa el nombre y descripción del curso.)'
    if (fileTexts.length > 0) {
      fileContext = 'MATERIAL DE REFERENCIA:\n' + fileTexts.slice(0, 3).map((ft, i) =>
        `--- ${ft.filename || 'Archivo ' + (i + 1)} ---\n${ft.text.slice(0, 8000)}`
      ).join('\n\n')
      log(`[roadmap] usando ${fileTexts.length} archivos como contexto (${fileTexts.reduce((s, f) => s + f.text.length, 0)} chars)`)
    }

    const userMsg = `Curso: ${title}\nDescripción: ${description || 'Sin descripción'}\nCategoría: ${category || 'general'}\nNivel: ${level || 'general'}, rigor: ${rigor}/5.\n${fileContext}\n\nGenera 5-10 nodos con contenido completo. SOLO JSON, sin markdown.`

    const raw = await callNvidia({ system: ROADMAP_SYSTEM, userMessage: userMsg, temperature: 0.6, maxTokens: 8192 })
    log(`[roadmap] respuesta IA: ${raw.length} chars, primeros 200: ${raw.slice(0, 200).replace(/\n/g, '\\n')}`)
    log(`[roadmap] últimos 200: ${raw.slice(-200).replace(/\n/g, '\\n')}`)

    let parsed
    try {
      parsed = safeParseJson(raw)
    } catch (parseErr) {
      warn(`[roadmap] ERROR parseando JSON: ${parseErr.message}`)
      // Fallback: try to find any JSON in the response
      const fbMatch = raw.match(/\{[\s\S]*\}/)
      if (fbMatch) {
        const fb = fbMatch[0].replace(/,\s*([}\]])/g, '$1')
        try { parsed = JSON.parse(fb); if (parsed.roadmap?.nodes) parsed = parsed.roadmap } catch {}
      }
      if (!parsed) throw parseErr
      log(`[roadmap] parseado con fallback: ${parsed.nodes?.length || 0} nodos`)
    }
    const generated = enforceRegulation(parsed.nodes ?? [])
    if (generated.length === 0) return res.status(500).json({ error: 'La IA no generó nodos válidos' })

    log(`[roadmap] ${generated.length} nodos generados con contenido`)
    res.json({ nodes: generated, count: generated.length, regulation_applied: true })
  } catch (err) {
    warn('ROADMAP', 'error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 3. Answer student question (chat/tutor) ─────────────────
app.post('/api/ask', authenticate, async (req, res) => {
  try {
    const { question, courseTitle, fileTexts = [], history = [] } = req.body
    if (!question) return res.status(400).json({ error: 'Falta la pregunta' })

    let context = `Curso: ${courseTitle || 'Sin especificar'}`
    if (fileTexts.length > 0) {
      context += '\n\nMATERIAL DE REFERENCIA DEL CURSO:\n' + fileTexts.slice(0, 5).map((ft, i) =>
        `--- ${ft.filename || 'Material ' + (i + 1)} ---\n${ft.text.slice(0, 5000)}`
      ).join('\n\n')
    }

    const historyText = history.length > 0
      ? '\n\nHistorial de la conversación:\n' + history.filter(m => m.text && m.text.trim()).slice(-6).map(m => `${m.role === 'student' ? 'Estudiante' : 'Tutor'}: ${m.text}`).join('\n')
      : ''

    const userMsg = `${context}${historyText}\n\nPregunta del estudiante: ${question}\n\nResponde basándote ESTRICTAMENTE en el material de referencia. Sé conciso y educativo.`

    const answer = await callNvidia({ system: CHAT_SYSTEM, userMessage: userMsg, temperature: 0.4, maxTokens: 2048 })
    res.json({ answer, source: 'ai-backend' })
  } catch (err) {
    warn('ASK', 'error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 4. Generate quiz ────────────────────────────────────────
app.post('/api/quiz', authenticate, async (req, res) => {
  try {
    const { fileTexts = [], count = 5, courseTitle } = req.body

    let context = `Curso: ${courseTitle || 'Sin especificar'}`
    if (fileTexts.length > 0) {
      context += '\n\nMATERIAL DE REFERENCIA:\n' + fileTexts.map((ft, i) =>
        `--- ${ft.filename || 'Material ' + (i + 1)} ---\n${ft.text.slice(0, 4000)}`
      ).join('\n\n')
    }

    const userMsg = `${context}\n\nGenera ${count} preguntas de opción múltiple basadas ESTRICTAMENTE en el material de referencia.\nFormato JSON: {"title":"Quiz: [tema]","questions":[{"id":1,"text":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]}\nSOLO JSON, sin markdown.`

    const raw = await callNvidia({ system: QUIZ_SYSTEM, userMessage: userMsg, temperature: 0.5, maxTokens: 4096 })
    const parsed = safeParseJson(raw)
    res.json({ quiz: parsed, source: 'ai-backend' })
  } catch (err) {
    warn('QUIZ', 'error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 5. Fetch course source files and extract text ──────────
app.post('/api/course-sources', authenticate, async (req, res) => {
  try {
    const { courseId } = req.body
    if (!courseId) return res.status(400).json({ error: 'Falta courseId' })

    const { data: sources, error: sourcesError } = await supabase
      .from('source_files')
      .select('id, filename, storage_path')
      .eq('course_id', courseId)

    if (sourcesError) throw sourcesError
    if (!sources || sources.length === 0) return res.json({ files: [] })

    const files = []
    for (const src of sources) {
      try {
        const { data: fileData, error: dlError } = await supabase.storage
          .from('course-source')
          .download(src.storage_path)
        if (dlError || !fileData) {
          warn(`[course-sources] no se pudo descargar ${src.storage_path}:`, dlError?.message)
          continue
        }
        const buffer = Buffer.from(await fileData.arrayBuffer())
        let text = ''
        if (src.filename.toLowerCase().endsWith('.pdf')) {
          const data = await pdfParse(buffer)
          text = data.text || ''
        } else {
          text = buffer.toString('utf-8')
        }
        if (text.trim().length > 20) {
          files.push({ filename: src.filename, text: text.trim().slice(0, 10000) })
        }
      } catch (err) {
        warn(`[course-sources] error procesando ${src.filename}:`, err.message)
      }
    }

    res.json({ files })
    log(`[course-sources] ${files.length}/${sources.length} archivos extraídos para curso ${courseId}`)
  } catch (err) {
    warn('SOURCES', 'error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 6. Stream answer (for chat UX) ──────────────────────────
app.post('/api/ask-stream', authenticate, async (req, res) => {
  try {
    const { question, courseTitle, fileTexts = [], history = [], contentMode = false } = req.body
    if (!question) return res.status(400).json({ error: 'Falta la pregunta' })

    let context = `Curso: ${courseTitle || 'Sin especificar'}`
    if (fileTexts.length > 0) {
      context += '\n\nMATERIAL DE REFERENCIA DEL CURSO:\n' + fileTexts.slice(0, 5).map((ft, i) =>
        `--- ${ft.filename || 'Material ' + (i + 1)} ---\n${ft.text.slice(0, 5000)}`
      ).join('\n\n')
    }

    const historyText = history.length > 0
      ? '\n\nHistorial:\n' + history.filter(m => m.text && m.text.trim()).slice(-6).map(m => `${m.role === 'student' ? 'Estudiante' : 'Tutor'}: ${m.text}`).join('\n')
      : ''

    const systemPrompt = contentMode ? CONTENT_GENERATION_SYSTEM : CHAT_SYSTEM
    const suffix = contentMode ? '\n\nGenera una versión alternativa completa de esta lección en HTML.' : ''
    const userMsg = `${context}${historyText}\n\nPregunta: ${question}${suffix}\n\nResponde basándote ESTRICTAMENTE en el material. Sé conciso y educativo.`

    // NVIDIA doesn't support streaming via the basic API; we get the full response and stream it back
    const answer = await callNvidia({ system: systemPrompt, userMessage: userMsg, temperature: 0.4, maxTokens: contentMode ? 4096 : 2048 })

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
    warn('ASK-STREAM', 'error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// ─── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: LLM_MODEL, hasKey: !!NVIDIA_API_KEY })
})

app.listen(PORT, () => {
  log(`\n  EduApp AI Backend corriendo en http://localhost:${PORT}`)
  log(`  Modelo: ${LLM_MODEL}`)
  log(`  API Key configurada: ${!!NVIDIA_API_KEY}\n`)
})
