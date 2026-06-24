// Test the new safeParseJson with truncated JSON
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const KEY = env.NVIDIA_API_KEY || env.VITE_NVIDIA_API_KEY

const SYSTEM = `Eres un disenador instruccional experto. Genera un roadmap educativo en JSON.
FORMATO OBLIGATORIO: {"title":"...","nodes":[...]}
TIPOS: theory (leccion), quiz (4 preguntas), boss (examen final, ultimo nodo)
ESTRUCTURA:
theory: {"position":N,"type":"theory","title":"Titulo","description":"...","content":"<h2>...</h2><p>150-250 palabras contenido REAL del material.</p>"}
quiz: {"position":N,"type":"quiz","title":"Quiz: ...","description":"...","content":"{\\"questions\\":[{\\"id\\":1,\\"text\\":\\"Pregunta especifica sobre definiciones/datos?\\",\\"options\\":[\\"A) Correcta\\",\\"B) Distractor\\",\\"C) Distractor\\",\\"D) Distractor\\"],\\"correct\\":0,\\"explanation\\":\\"Explicacion 40+ chars\\"},...]}"}
boss: {"position":N,"type":"boss","title":"Examen Final","description":"...","content":"{\\"questions\\":[...,...],\\"congratulations\\":\\"Felicitaciones!\\"}"}
REGLAS:
1. {"title":"...","nodes":[...]} - NO {"roadmap":[...]}
2. theory: 150-250 palabras HTML, contenido REAL
3. Cada quiz: 4 preguntas ESPECIFICAS (Que es X? Cual es la funcion de Y?)
4. NUNCA preguntas genericas
5. Cada pregunta: 4 opciones, 1 correcta, basada en el material
6. Explicaciones: 40+ caracteres
7. boss: 5 preguntas + "congratulations"
8. NUNCA null en content
9. SOLO JSON. Sin markdown. Sin texto extra.`

const USER = `Curso: Diseño de VUI con IA
Material:
--- Diseño de VUI con IA.pdf ---
El diseño de interfaces de voz (VUI) es el proceso de crear interfaces que permiten a los usuarios interactuar con sistemas mediante voz. Las principales herramientas incluyen Amazon Alexa, Google Assistant y Apple Siri. Los flujos de conversacion son secuencias de interacciones entre el usuario y el sistema.
Genera 8 nodos: theory, theory, quiz, theory, theory, quiz, theory, boss.
Cada theory: 150-250 palabras HTML.
Cada quiz: 4 preguntas especificas.
Boss: 5 preguntas + "congratulations".
{"title":"...","nodes":[...]} - NO {"roadmap":[...]}
SOLO JSON.`

console.log('=== TEST 1: Short prompt should not truncate ===')
const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
  body: JSON.stringify({
    model: 'moonshotai/kimi-k2.6',
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
    temperature: 0.6,
    max_tokens: 8192
  })
})
const json = await res.json()
const content = json.choices?.[0]?.message?.content || ''
console.log('Time:', Date.now(), 'ms')
console.log('Length:', content.length, 'chars')

// Test structural parsing
function countStructural(str) {
  let ob = 0, cb = 0, obr = 0, cbr = 0, inStr = false, esc = false
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (inStr) {
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === '"') { inStr = false; continue }
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === '{') ob++
    else if (c === '}') cb++
    else if (c === '[') obr++
    else if (c === ']') cbr++
  }
  return { ob, cb, obr, cbr, diffBrace: ob - cb, diffBracket: obr - cbr }
}

const struct = countStructural(content)
console.log('Structural braces:', JSON.stringify(struct))
console.log('Balanced:', struct.diffBrace === 0 && struct.diffBracket === 0)

// Test direct parse
try {
  const parsed = JSON.parse(content)
  const nodes = parsed.nodes || parsed.roadmap?.nodes || []
  console.log('Direct parse OK! Nodes:', nodes.length)
  for (const n of nodes) {
    console.log(`  [${n.position}] ${n.type}: ${n.title?.slice(0, 40)} (${(n.content||'').length} chars)`)
  }
} catch (e) {
  console.log('Direct parse FAILED:', e.message)
  
  // Test individual node extraction
  function extractNodesFromPartial(raw) {
    const nodesIdx = raw.indexOf('"nodes"')
    if (nodesIdx === -1) return []
    const arrStart = raw.indexOf('[', nodesIdx)
    if (arrStart === -1) return []
    let depth = 0, inStr = false, esc = false, nodes = []
    let curStart = -1
    for (let i = arrStart; i < raw.length; i++) {
      const c = raw[i]
      if (inStr) { if (esc) { esc = false; continue }; if (c === '\\') { esc = true; continue }; if (c === '"') { inStr = false; continue }; continue }
      if (c === '"') { inStr = true; continue }
      if (c === '[') { depth++; if (depth === 1) curStart = -1; continue }
      if (c === ']') { depth--; if (depth === 0) break; continue }
      if (c === '{') { if (depth === 1) curStart = i; depth++; continue }
      if (c === '}') { depth--; if (depth === 1 && curStart !== -1) { try { const node = JSON.parse(raw.slice(curStart, i + 1)); if (node?.type) nodes.push(node) } catch {}; curStart = -1 }; continue }
    }
    return nodes
  }
  
  const partialNodes = extractNodesFromPartial(content)
  console.log('Partial extraction: Got', partialNodes.length, 'nodes')
  for (const n of partialNodes) {
    console.log(`  [${n.position}] ${n.type}: ${n.title?.slice(0, 40)} (${(n.content||'').length} chars)`)
  }
}

// Simulate truncated JSON (cut at 80%)
console.log('\n=== TEST 2: Simulated truncated response (cut at 80%) ===')
const cutPoint = Math.floor(content.length * 0.8)
const truncated = content.slice(0, cutPoint)
const struct2 = countStructural(truncated)
console.log('Truncated length:', truncated.length)
console.log('Structural braces:', JSON.stringify(struct2))
console.log('Missing:', struct2.diffBrace, 'braces,', struct2.diffBracket, 'brackets')

const partialNodes2 = (function extractNodesFromPartial(raw) {
    const nodesIdx = raw.indexOf('"nodes"')
    if (nodesIdx === -1) return []
    const arrStart = raw.indexOf('[', nodesIdx)
    if (arrStart === -1) return []
    let depth = 0, inStr = false, esc = false, nodes = []
    let curStart = -1
    for (let i = arrStart; i < raw.length; i++) {
      const c = raw[i]
      if (inStr) { if (esc) { esc = false; continue }; if (c === '\\') { esc = true; continue }; if (c === '"') { inStr = false; continue }; continue }
      if (c === '"') { inStr = true; continue }
      if (c === '[') { depth++; if (depth === 1) curStart = -1; continue }
      if (c === ']') { depth--; if (depth === 0) break; continue }
      if (c === '{') { if (depth === 1) curStart = i; depth++; continue }
      if (c === '}') { depth--; if (depth === 1 && curStart !== -1) { try { const node = JSON.parse(raw.slice(curStart, i + 1)); if (node?.type) nodes.push(node) } catch {}; curStart = -1 }; continue }
    }
    return nodes
  })(truncated)
console.log('Partial extraction (truncated): Got', partialNodes2.length, 'nodes')
for (const n of partialNodes2) {
  console.log(`  [${n.position}] ${n.type}: ${n.title?.slice(0, 40)} (${(n.content||'').length} chars)`)
}
