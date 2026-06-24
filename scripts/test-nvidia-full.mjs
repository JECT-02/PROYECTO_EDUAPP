import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const KEY = env.NVIDIA_API_KEY || env.VITE_NVIDIA_API_KEY
console.log('Testing full roadmap prompt...')

const SYSTEM = `Genera un roadmap educativo en JSON. SOLO 3 tipos de nodo: theory, quiz, boss.

FORMATO OBLIGATORIO:
{"title":"Nombre del curso","nodes":[
  {"position":1,"type":"theory","title":"...","description":"...","content":"<h2>...</h2><p>250-400 palabras...</p>"},
  {"position":2,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":3,"type":"quiz","title":"Quiz: ...","description":"...","content":"{\\"questions\\":[{\\"id\\":1,\\"text\\":\\"...\\",\\"options\\":[\\"A)...\\",\\"B)...\\",\\"C)...\\",\\"D)...\\"],\\"correct\\":0,\\"explanation\\":\\"...\\"}]}"},
  {"position":4,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":5,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":6,"type":"quiz","title":"Quiz: ...","description":"...","content":"{\\"questions\\":[...4 preguntas...]}"}
  {"position":7,"type":"theory","title":"...","description":"...","content":"..."},
  {"position":8,"type":"boss","title":"Examen Final","description":"...","content":"{\\"questions\\":[...6-8 preguntas...],\\"congratulations\\":\\"Felicitaciones!...\\"}"}
]}

REGLAS:
- SIEMPRE empieza con {"title":...,"nodes":[...]}
- NUNCA uses {"roadmap":[...]} - usa {"title":...,"nodes":[...]}
- theory: 250-400 palabras HTML, contenido REAL
- quiz: 4 preguntas con explicaciones de 30+ chars
- boss: 6-8 preguntas + campo "congratulations"
- Posiciones: 1,2,3,4,5,6,7,8
- NUNCA null en content
- SOLO JSON. Sin markdown. Sin texto extra.`

const USER = `Curso: Diseno de VUI con IA
Descripcion: Curso sobre flujos y herramientas de diseno de interfaces de voz
Categoria: technology
Nivel: intermediate

Material de referencia:
MATERIAL DE REFERENCIA:
--- Diseno de VUI con IA.pdf ---
El diseno de interfaces de voz (VUI) es el proceso de crear interfaces que permiten a los usuarios interactuar con sistemas mediante voz. Las principales herramientas incluyen Amazon Alexa, Google Assistant y Apple Siri. Los flujos de conversacion son secuencias de interacciones entre el usuario y el sistema. Un buen diseno VUI debe considerar: confirmacion de entrada, manejo de errores, personalizacion y contexto. Las mejores practicas incluyen pruebas de usuario iterativas, diseno de dialogos naturales y manejo de intenciones ambiguas.

Genera un roadmap de 8 nodos en este orden EXACTO:
theory -> theory -> quiz -> theory -> theory -> quiz -> theory -> boss

Cada theory: contenido HTML real de 250-400 palabras basado en el material.
Cada quiz: 4 preguntas de opcion multiple con explicaciones.
El boss: 6-8 preguntas + campo "congratulations" con felicitacion.

IMPORTANTE: El JSON debe tener la estructura EXACTA:
{"title":"Nombre del curso","nodes":[{"position":1,"type":"theory",...}]}
NO uses {"roadmap":[...]}. Usa {"title":"...","nodes":[...]}.
SOLO JSON valido. Sin markdown, sin texto extra.`

const start = Date.now()
const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
  body: JSON.stringify({
    model: 'moonshotai/kimi-k2.6',
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: USER }
    ],
    temperature: 0.6,
    max_tokens: 16384
  })
})
console.log('Status:', res.status)
const json = await res.json()
const content = json.choices?.[0]?.message?.content || ''
const time = Date.now() - start
console.log('Time:', time, 'ms')
console.log('Content length:', content.length, 'chars')
console.log('Usage:', JSON.stringify(json.usage))

// Try to parse
let parsed = null
try { parsed = JSON.parse(content) } catch {}
if (!parsed) {
  const cleaned = content.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
  try { parsed = JSON.parse(cleaned) } catch {}
}
if (!parsed) {
  const i1 = content.indexOf('{')
  const i2 = content.lastIndexOf('}')
  if (i1 !== -1 && i2 > i1) {
    try { parsed = JSON.parse(content.slice(i1, i2 + 1)) } catch {}
  }
}

// normalizeRoadmap: always get { title, nodes[] }
function normalizeRoadmap(obj) {
  if (!obj) return { title: '', nodes: [] }
  if (obj.nodes && Array.isArray(obj.nodes)) return obj
  if (Array.isArray(obj.roadmap)) return { title: obj.title || '', nodes: obj.roadmap }
  if (obj.roadmap?.nodes && Array.isArray(obj.roadmap.nodes)) return obj.roadmap
  if (obj.data?.nodes && Array.isArray(obj.data.nodes)) return obj.data
  if (Array.isArray(obj)) return { title: '', nodes: obj }
  return { title: '', nodes: [] }
}

if (parsed) {
  const normalized = normalizeRoadmap(parsed)
  console.log('Parse OK!')
  console.log('Nodes:', normalized.nodes.length)
  for (const n of normalized.nodes) {
    console.log(`  [${n.position}] ${n.type}: ${n.title?.slice(0, 50)} (${(n.content||'').length} chars)`)
  }
} else {
  console.log('PARSE FAILED')
  console.log('First 1500 chars:', content.slice(0, 1500))
  console.log('Last 500 chars:', content.slice(-500))
}
