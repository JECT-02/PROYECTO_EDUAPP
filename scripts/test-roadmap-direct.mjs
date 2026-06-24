// test-roadmap-direct.mjs
// Simulates: PDF extraction -> NVIDIA API call -> roadmap JSON -> validation
// Usage: node scripts/test-roadmap-direct.mjs

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- Config ---
const FETCH_TIMEOUT_MS = 300000 // 5 minutes for NVIDIA response
const NVIDIA_MODEL = 'moonshotai/kimi-k2.6'
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

// --- Load env vars ---
function loadEnv() {
  const envPath = resolve(ROOT, '.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

// --- Step 1: Extract text from PDF using pdfjs-dist ---
async function extractPdfText(pdfPath) {
  const t0 = Date.now()
  console.log('\n[Step 1] Extraccion de texto del PDF')

  const pdfjsLib = await import('pdfjs-dist')
  const workerPath = resolve(ROOT, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('file:///' + workerPath.replace(/\\/g, '/')).href

  const buffer = readFileSync(pdfPath)
  const data = new Uint8Array(buffer)
  console.log('  Archivo: ' + (buffer.length / 1024 / 1024).toFixed(2) + ' MB')

  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise
  console.log('  Paginas: ' + pdf.numPages)

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(item => item.str).join(' ') + '\n'
  }

  const elapsed = Date.now() - t0
  console.log('  Texto extraido: ' + fullText.length + ' chars en ' + elapsed + 'ms')
  return fullText.trim()
}

// --- Step 2: Call NVIDIA API directly (same as frontend) ---
async function callNvidia(title, description, fileContext) {
  const t0 = Date.now()
  console.log('\n[Step 2] Llamada a NVIDIA ' + NVIDIA_MODEL)

  const systemPrompt = `Eres un disenador instruccional experto. Genera un roadmap de aprendizaje en formato JSON.

SOLO EXISTEN 3 TIPOS DE NODO:
1. "theory": Leccion teorica con contenido educativo completo.
2. "quiz": Evaluacion sobre los temas vistos en los nodos theory ANTERIORES.
3. "boss": Examen final integrador (siempre el ultimo nodo).

ESTRUCTURA OBLIGATORIA:
- Primer nodo: SIEMPRE "theory"
- Despues de cada 2 o 3 nodos theory consecutivos: SIEMPRE un "quiz"
- Ultimo nodo: SIEMPRE "boss"

REGLAS PARA QUIZ:
- EXACTAMENTE 4 preguntas de opcion multiple
- Cada pregunta tiene 4 opciones (A, B, C, D)
- Preguntas ESPECIFICAS sobre el contenido de los nodos theory ANTERIORES
- Campo "explanation" (minimo 20 chars)
- Campo "correct" es indice 0-based

CONTENIDO DE NODOS THEORY:
- HTML con <h2>, <p>, <strong>, <ul>/<li>
- 300-600 palabras de contenido real y especifico

CONTENIDO DE NODOS QUIZ (formato JSON string):
{"questions":[{"id":1,"text":"Pregunta","options":["A) Op1","B) Op2","C) Op3","D) Op4"],"correct":0,"explanation":"Explicacion"}]}

CONTENIDO DE NODOS BOSS:
- 5-8 preguntas que integren TODO el contenido

REGLAS GENERALES:
1. Primer nodo = "theory", ultimo nodo = "boss"
2. Despues de cada 2-3 nodos theory -> quiz obligatorio
3. Entre 6 y 12 nodos en total
4. Titulos en espanol, max 60 caracteres
5. NO uses placeholder text
6. USA el material de referencia

RESPONDE SOLO CON JSON. Sin markdown, sin texto adicional.
{
  "title": "Nombre del curso",
  "nodes": [
    {"position": 1, "type": "theory", "title": "Titulo", "description": "Desc", "content": "<h2>Sub</h2><p>Contenido...</p>"},
    {"position": 2, "type": "quiz", "title": "Quiz: Tema", "description": "Evalua...", "content": "{\\\"questions\\\":[...]}"},
    {"position": 3, "type": "boss", "title": "Examen Final", "description": "Integrador", "content": "{\\\"questions\\\":[...]}"}
  ]
}`

  const userMsg = `Curso: ${title}
Descripcion: ${description}
Categoria: Preuniversitario
Nivel: 15-17, rigor: 3/5.

MATERIAL DE REFERENCIA:
--- Archivo 1 ---
${fileContext}

REGLAS CRITICAS:
- SOLO 3 tipos de nodo: theory, quiz, boss
- Despues de cada 2-3 nodos theory -> OBLIGATORIO un quiz
- Primer nodo = theory, ultimo nodo = boss
- Cada quiz tiene 4 preguntas REALES con explicaciones
- Nodos theory con 300-600 palabras de contenido REAL
- Entre 6 y 12 nodos en total
- NO uses texto placeholder
- Genera 6-12 nodos con contenido completo. SOLO JSON, sin markdown.`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.VITE_NVIDIA_API_KEY,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.6,
        max_tokens: 12288,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown')
      throw new Error('NVIDIA error ' + res.status + ': ' + errBody.slice(0, 300))
    }

    const json = await res.json()
    const raw = json?.choices?.[0]?.message?.content || ''
    const elapsed = Date.now() - t0
    console.log('  Respuesta: ' + raw.length + ' chars en ' + (elapsed / 1000).toFixed(1) + 's')

    // Save raw for debugging
    writeFileSync(resolve(ROOT, 'scripts', 'last-roadmap-raw.txt'), raw, 'utf8')
    console.log('  Raw guardado en scripts/last-roadmap-raw.txt')

    return raw
  } finally {
    clearTimeout(timer)
  }
}

// --- Step 3: Parse JSON response ---
function parseRoadmapJson(raw) {
  console.log('\n[Step 3] Parseo de JSON')

  if (!raw || raw === '{}') throw new Error('Respuesta vacia')

  // Extract JSON object boundaries
  let s = raw.trim()
  const i1 = s.indexOf('{')
  const i2 = s.lastIndexOf('}')
  if (i1 !== -1 && i2 > i1) s = s.slice(i1, i2 + 1)

  // Remove markdown fences
  s = s.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()

  // Re-extract after cleaning
  const b1 = s.indexOf('{')
  const b2 = s.lastIndexOf('}')
  if (b1 !== -1 && b2 > b1) s = s.slice(b1, b2 + 1)

  // Attempt 1: direct parse
  try {
    const result = JSON.parse(s)
    if (result.roadmap && Array.isArray(result.roadmap.nodes)) return result.roadmap
    console.log('  Parseado directamente')
    return result
  } catch (e) {
    console.log('  Parse directo falla: ' + e.message.slice(0, 100))
  }

  // Attempt 2: fix trailing commas
  let cleaned = s.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/gm, '')
  try {
    const result = JSON.parse(cleaned)
    if (result.roadmap && Array.isArray(result.roadmap.nodes)) return result.roadmap
    console.log('  Parseado con limpieza de comas')
    return result
  } catch (e) {
    console.log('  Parse con limpieza falla: ' + e.message.slice(0, 100))
  }

  // Attempt 3: manual extraction - find "nodes" array and extract individual objects
  console.log('  Intentando extraccion manual de nodos...')
  const titleMatch = s.match(/"title"\s*:\s*"([^"]+)"/)
  const title = titleMatch ? titleMatch[1] : 'Curso'

  const nodesIdx = s.indexOf('"nodes"')
  if (nodesIdx === -1) throw new Error('No se encontro "nodes" en la respuesta')

  const arrStart = s.indexOf('[', nodesIdx)
  if (arrStart === -1) throw new Error('No se encontro "[" despues de "nodes"')

  // Find matching ]
  let depth = 0
  let arrEnd = -1
  for (let i = arrStart; i < s.length; i++) {
    if (s[i] === '[') depth++
    else if (s[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break } }
  }
  if (arrEnd === -1) throw new Error('No se encontro cierre del array "nodes"')

  const nodesRaw = s.slice(arrStart, arrEnd + 1)

  // Extract individual node objects by tracking braces
  const nodes = []
  let nodeStart = -1
  depth = 0
  for (let i = 0; i < nodesRaw.length; i++) {
    if (nodesRaw[i] === '{') {
      if (depth === 0) nodeStart = i
      depth++
    } else if (nodesRaw[i] === '}') {
      depth--
      if (depth === 0 && nodeStart !== -1) {
        let nodeStr = nodesRaw.slice(nodeStart, i + 1)
        nodeStr = nodeStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        try {
          nodes.push(JSON.parse(nodeStr))
        } catch {
          // If the content field has unescaped JSON inside, try to fix it
          try {
            const fixed = nodeStr
              .replace(/"content"\s*:\s*"/, '"content_raw": "')
              .replace(/",\s*"(position|type|title|description)"/g, '", "$1"')
            const partial = JSON.parse(fixed)
            nodes.push(partial)
          } catch {
            console.log('  Nodo ' + (nodes.length + 1) + ': no se pudo parsear, se omite')
          }
        }
        nodeStart = -1
      }
    }
  }

  if (nodes.length === 0) throw new Error('No se pudieron extraer nodos del JSON')

  console.log('  Extraccion manual: ' + nodes.length + ' nodos')
  return { title, nodes }
}

// --- Step 4: Validate and enforce regulation ---
function enforceRegulation(nodes) {
  console.log('\n[Step 4] Validacion y regulacion')

  const ALLOWED = new Set(['theory', 'quiz', 'boss'])
  const sorted = [...nodes].sort((a, b) => (a.position || 0) - (b.position || 0))

  // Fix non-allowed types
  for (const n of sorted) {
    if (!ALLOWED.has(n.type)) {
      console.log('  Nodo "' + n.title + '" tipo "' + n.type + '" -> theory')
      n.type = 'theory'
    }
  }

  // First node must be theory
  if (sorted[0].type !== 'theory') {
    sorted[0].type = 'theory'
  }

  // Last node must be boss
  const last = sorted[sorted.length - 1]
  if (last.type !== 'boss') {
    sorted.push({
      title: 'Examen Final',
      type: 'boss',
      description: 'Examen final integrador.',
      position: sorted.length + 1,
      content: null,
    })
  }

  // Enforce quiz every 2-3 theory nodes
  const result = []
  let consecutiveTheory = 0

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]
    if (node.type === 'theory') {
      consecutiveTheory++
      result.push(node)
      if (consecutiveTheory >= 2) {
        const next = sorted[i + 1]
        if (!next || (next.type !== 'quiz' && next.type !== 'boss')) {
          result.push({
            title: 'Quiz: Evaluacion ' + result.length,
            type: 'quiz',
            description: 'Evaluacion de los temas anteriores',
            content: null,
            position: 0,
          })
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

  // Reassign positions
  const final = result.map((n, i) => ({ ...n, position: i + 1 }))

  // Stats
  const counts = { theory: 0, quiz: 0, boss: 0 }
  for (const n of final) counts[n.type]++
  console.log('  Nodos: ' + final.length + ' (theory:' + counts.theory + ' quiz:' + counts.quiz + ' boss:' + counts.boss + ')')
  console.log('  Secuencia: ' + final.map(n => n.type).join(' -> '))

  return final
}

// --- Main ---
async function main() {
  loadEnv()

  const apiKey = process.env.VITE_NVIDIA_API_KEY
  if (!apiKey) {
    console.error('ERROR: VITE_NVIDIA_API_KEY no encontrada en .env')
    process.exit(1)
  }

  const pdfPath = resolve(ROOT, 'PREUNIVERSITARIO-GUIADELESTUDIANTE-2026-2.pdf')
  console.log('='.repeat(60))
  console.log('  TEST: Generacion de Roadmap (flujo directo)')
  console.log('='.repeat(60))
  console.log('PDF: ' + pdfPath)
  console.log('Modelo: ' + NVIDIA_MODEL)
  console.log('API Key: ' + apiKey.slice(0, 12) + '...')

  const totalT0 = Date.now()

  try {
    // Step 1
    const extractedText = await extractPdfText(pdfPath)
    if (extractedText.length < 100) {
      throw new Error('Texto extraido muy corto (' + extractedText.length + ' chars)')
    }

    // Step 2: send only first 8000 chars to keep API fast
    const contextForApi = extractedText.slice(0, 8000)
    const rawResponse = await callNvidia(
      'Preuniversitario Guia del Estudiante 2026',
      'Guia completa de preparacion preuniversitaria: matematicas, comunicacion, ciencia, historia y economia.',
      contextForApi
    )

    // Step 3
    const parsed = parseRoadmapJson(rawResponse)
    const nodes = parsed.nodes || []
    if (nodes.length === 0) throw new Error('La IA no genero ningun nodo')
    console.log('  JSON parseado: ' + nodes.length + ' nodos')

    // Step 4
    const finalNodes = enforceRegulation(nodes)

    // Quality check
    const issues = []
    for (const n of finalNodes) {
      if (!n.content || n.content.length < 100) {
        issues.push('Nodo "' + n.title + '" contenido corto (' + (n.content?.length || 0) + ' chars)')
      }
      if (n.type === 'quiz' || n.type === 'boss') {
        try {
          const qd = typeof n.content === 'string' ? JSON.parse(n.content) : n.content
          if (!qd?.questions || qd.questions.length < 3) {
            issues.push('Nodo "' + n.title + '" menos de 3 preguntas')
          }
        } catch {
          issues.push('Nodo "' + n.title + '" contenido no es JSON valido')
        }
      }
    }

    // Final report
    const totalElapsed = Date.now() - totalT0
    console.log('\n' + '='.repeat(60))
    console.log('  RESULTADO FINAL')
    console.log('='.repeat(60))
    console.log('  Tiempo total: ' + (totalElapsed / 1000).toFixed(1) + 's')
    console.log('  Nodos generados: ' + finalNodes.length)
    console.log('  Tipos: ' + finalNodes.map(n => n.type).join(' -> '))
    console.log('')

    for (const n of finalNodes) {
      const cLen = n.content ? n.content.length : 0
      const preview = n.content ? n.content.replace(/<[^>]*>/g, '').slice(0, 80) : '(sin contenido)'
      console.log('  [' + n.position + '] ' + n.type.toUpperCase().padEnd(6) + ' | ' + n.title)
      console.log('         ' + cLen + ' chars | "' + preview + '..."')
    }

    console.log('')
    if (issues.length > 0) {
      console.log('  PROBLEMAS:')
      for (const issue of issues) console.log('    - ' + issue)
    } else {
      console.log('  OK: Sin problemas detectados.')
    }

    console.log('='.repeat(60))

  } catch (err) {
    const totalElapsed = Date.now() - totalT0
    console.error('\n' + '='.repeat(60))
    console.error('  ERROR')
    console.error('='.repeat(60))
    console.error('  Tiempo: ' + (totalElapsed / 1000).toFixed(1) + 's')
    console.error('  Error: ' + err.message)
    console.error('='.repeat(60))
    process.exit(1)
  }
}

main()
