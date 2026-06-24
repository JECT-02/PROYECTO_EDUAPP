import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const KEY = env.NVIDIA_API_KEY || env.VITE_NVIDIA_API_KEY

const SYSTEM = `Genera un roadmap educativo en JSON. SOLO 3 tipos: theory, quiz, boss.

FORMATO OBLIGATORIO:
{"title":"Nombre","nodes":[...]}

theory: {"position":N,"type":"theory","title":"...","description":"...","content":"<h2>...</h2><p>250-400 palabras de contenido real y util...</p>"}

quiz: {"position":N,"type":"quiz","title":"Quiz: ...","description":"Evalua los temas vistos","content":"{\\"questions\\":[{\\"id\\":1,\\"text\\":\\"PREGUNTA ESPECIFICA sobre definiciones, conceptos o datos del material?\\",\\"options\\":[\\"A) Opcion correcta y real\\",\\"B) Distractor creible\\",\\"C) Distractor creible\\",\\"D) Distractor creible\\"],\\"correct\\":0,\\"explanation\\":\\"MINIMO 40 caracteres explicando por que es correcta y por que las otras son incorrectas.\\"},{\\"id\\":2,...},{\\"id\\":3,...},{\\"id\\":4,...}]}"}

boss: {"position":N,"type":"boss","title":"Examen Final","description":"Evaluacion integral","content":"{\\"questions\\":[{\\"id\\":1,\\"text\\":\\"...\\",\\"options\\":[\\"A)...\\",\\"B)...\\",\\"C)...\\",\\"D)...\\",\\"correct\\":0,\\"explanation\\":\\"...\\"},{\\"id\\":2,...},{\\"id\\":3,...},{\\"id\\":4,...},{\\"id\\":5,...},{\\"id\\":6,...}],\\"congratulations\\":\\"Felicitaciones! Has completado el curso.\\\"}"}

REGLAS CRITICAS:
1. SIEMPRE {"title":"...","nodes":[...]} - NUNCA {"roadmap":[...]}
2. Las preguntas del quiz y boss DEBEN ser ESPECIFICAS: sobre definiciones, conceptos, datos REALES del material
3. Cada pregunta DEBE tener 4 opciones donde SOLO 1 sea correcta
4. Las opciones correctas DEBEN estar basadas en el material de referencia
5. Las explicaciones DEBEN tener MINIMO 40 caracteres
6. theory: 250-400 palabras HTML con contenido REAL
7. Posiciones: 1,2,3,4,5,6,7,8
8. NUNCA null en content
9. SOLO JSON`

const USER = `Curso: Diseno de VUI con IA
Material:
--- Diseno de VUI con IA.pdf ---
El diseno de interfaces de voz (VUI) es el proceso de crear interfaces que permiten a los usuarios interactuar con sistemas mediante voz. Las principales herramientas incluyen Amazon Alexa, Google Assistant y Apple Siri. Los flujos de conversacion son secuencias de interacciones entre el usuario y el sistema. Un buen diseno VUI debe considerar: confirmacion de entrada, manejo de errores, personalizacion y contexto. Las mejores practicas incluyen pruebas de usuario iterativas, diseno de dialogos naturales y manejo de intenciones ambiguas. El NLU (Natural Language Understanding) procesa la intencion del usuario. Los slots son parametros que el sistema necesita para completar una tarea. El manejo de errores incluye: confirmacion negativa, pedir reformulacion, y ofrecer alternativas. Las metricas de evaluacion VUI incluyen: tasa de exito, tiempo de completacion, y satisfaccion del usuario.

Genera 8 nodos: theory, theory, quiz, theory, theory, quiz, theory, boss.
IMPORTANTE: {"title":"...","nodes":[...]} - NO {"roadmap":[...]}
Cada quiz: 4 preguntas ESPECIFICAS basadas en el material.
Cada theory: 250-400 palabras de contenido real.
El boss: 6 preguntas + "congratulations".
SOLO JSON. Sin markdown.`

console.log('Testing quiz content...')
const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
  body: JSON.stringify({
    model: 'moonshotai/kimi-k2.6',
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
    temperature: 0.6,
    max_tokens: 16384
  })
})
const json = await res.json()
const content = json.choices?.[0]?.message?.content || ''
console.log('Time:', Date.now(), 'Chars:', content.length)

function normalizeRoadmap(obj) {
  if (!obj) return { title: '', nodes: [] }
  if (obj.nodes && Array.isArray(obj.nodes)) return obj
  if (Array.isArray(obj.roadmap)) return { title: obj.title || '', nodes: obj.roadmap }
  if (obj.roadmap?.nodes && Array.isArray(obj.roadmap.nodes)) return obj.roadmap
  if (Array.isArray(obj)) return { title: '', nodes: obj }
  return { title: '', nodes: [] }
}

let parsed = null
try { parsed = JSON.parse(content) } catch {}
if (!parsed) {
  const s = content.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
  try { parsed = JSON.parse(s) } catch {}
  if (!parsed) {
    const i1 = content.indexOf('{'), i2 = content.lastIndexOf('}')
    if (i1 !== -1 && i2 > i1) try { parsed = JSON.parse(content.slice(i1, i2 + 1)) } catch {}
  }
}

if (parsed) {
  const { nodes } = normalizeRoadmap(parsed)
  console.log(`\nNodes: ${nodes.length}`)
  for (const n of nodes) {
    console.log(`\n[${n.position}] ${n.type}: ${n.title}`)
    if (n.type === 'quiz' || n.type === 'boss') {
      try {
        const c = typeof n.content === 'string' ? JSON.parse(n.content) : n.content
        const q = c?.questions || []
        console.log(`  Questions: ${q.length}`)
        for (const question of q) {
          console.log(`    Q${question.id}: ${question.text?.slice(0, 80)}`)
          console.log(`      Correct: ${question.options?.[question.correct]}`)
          console.log(`      Explanation (${question.explanation?.length || 0} chars): ${question.explanation?.slice(0, 80)}`)
        }
        if (c.congratulations) console.log(`  Congratulations: ${c.congratulations.slice(0, 60)}`)
      } catch (e) {
        console.log(`  PARSE ERROR: ${e.message}`)
        console.log(`  Content (first 200): ${n.content?.slice(0, 200)}`)
      }
    } else {
      const words = (n.content || '').replace(/<[^>]*>/g, '').split(/\s+/).length
      console.log(`  Words: ${words}`)
    }
  }
} else {
  console.log('PARSE FAILED:', content.slice(0, 500))
}
