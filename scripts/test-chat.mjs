// scripts/test-chat.mjs
// Test de smoke: login + chat con un usuario de prueba
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } })

const TEST_EMAIL = 'default_student@eduapp.test'
const TEST_PASSWORD = 'student123'

const { data, error } = await supabase.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
})
if (error) {
  console.error('Login falló:', error.message)
  process.exit(1)
}
console.log(`✓ Login como ${data.user.email}`)

const token = data.session.access_token

// Buscar el curso demo
const { data: course } = await supabase
  .from('courses')
  .select('id, title, description')
  .eq('invite_code', 'DEMO01')
  .single()
if (!course) {
  console.error('No se encontró el curso demo')
  process.exit(1)
}
console.log(`✓ Curso: ${course.title} (id=${course.id})`)

// Probar la función chat
console.log('\n--- Probando chat function ---')
const question = '¿Qué es la célula?'
const res = await fetch(`${url}/functions/v1/chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ courseId: course.id, message: question }),
})

if (!res.ok) {
  const errText = await res.text()
  console.error(`✗ Chat error: ${res.status} ${errText}`)
  process.exit(1)
}

let answer = ''
const reader = res.body.getReader()
const decoder = new TextDecoder()
let buf = ''
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  buf += decoder.decode(value, { stream: true })
  const lines = buf.split('\n')
  buf = lines.pop() ?? ''
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const payload = line.slice(6).trim()
    if (payload === '[DONE]') continue
    try {
      const json = JSON.parse(payload)
      if (json.delta) answer += json.delta
    } catch { /* ignore */ }
  }
}
console.log(`\nPregunta: ${question}`)
console.log(`Respuesta IA: ${answer || '(vacía)'}`)
console.log('\n✓ Chat funciona end-to-end')
