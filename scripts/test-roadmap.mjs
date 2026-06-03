// scripts/test-roadmap.mjs
// Test del Edge Function generate-roadmap con la regulación aplicada
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '..', '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'default_teacher@eduapp.test',
  password: 'teacher123',
})
if (error) { console.error('Login error:', error.message); process.exit(1) }
const token = data.session.access_token
console.log(`✓ Login como ${data.user.email}`)

const { data: course } = await supabase
  .from('courses')
  .select('id, title, description')
  .eq('invite_code', 'DEMO01')
  .single()
console.log(`✓ Curso demo: ${course.title}`)

console.log('\n--- Generando roadmap ---')
const res = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/generate-roadmap`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ courseId: course.id, level: 3, rigor: 3 }),
})
if (!res.ok) {
  console.error('Error:', res.status, await res.text())
  process.exit(1)
}
const json = await res.json()
console.log(`✓ ${json.count} nodos generados. Regulación aplicada: ${json.regulation_applied}`)
console.log('\n--- Distribución de tipos ---')
const counts = {}
for (const n of json.nodes || []) {
  counts[n.type] = (counts[n.type] || 0) + 1
}
console.table(counts)
console.log('\n--- Plan de nodos ---')
for (const n of json.nodes || []) {
  console.log(`${String(n.position).padStart(2, ' ')}. [${n.type.padEnd(8)}] ${n.title}`)
}

// Validar regulación
const nodes = json.nodes || []
const quizPositions = nodes.filter(n => n.type === 'quiz').map(n => n.position)
let regulationOK = true
for (let i = 1; i < quizPositions.length; i++) {
  if (quizPositions[i] - quizPositions[i - 1] < 3) {
    console.error(`✗ Regla violada: quiz en pos ${quizPositions[i]} está muy cerca de quiz en pos ${quizPositions[i-1]}`)
    regulationOK = false
  }
}
if (nodes.length && nodes[0].type !== 'theory') {
  console.error('✗ Regla violada: primer nodo debe ser theory')
  regulationOK = false
}
if (nodes.length && nodes[nodes.length - 1].type !== 'boss') {
  console.error('✗ Regla violada: último nodo debe ser boss')
  regulationOK = false
}
if (regulationOK) console.log('\n✓ Regulación del roadmap respetada')
