// Quick test: call ai-backend /api/roadmap and log everything
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

// Login to get a token
const loginRes = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: env.VITE_SUPABASE_ANON_KEY },
  body: JSON.stringify({ email: 'default_teacher@eduapp.test', password: 'teacher123' })
})
const loginData = await loginRes.json()
if (!loginData.access_token) { console.error('Login failed:', loginData); process.exit(1) }
console.log('Logged in OK, token:', loginData.access_token.slice(0, 20) + '...')

const body = {
  title: 'Diseño de VUI con IA',
  description: 'Curso sobre flujos y herramientas de diseño de interfaces de voz',
  category: 'technology',
  level: 'intermediate',
  rigor: 3,
  fileTexts: [{ filename: 'Diseño de VUI con IA.pdf', text: 'El diseño de interfaces de voz (VUI) es el proceso de crear interfaces que permiten a los usuarios interactuar con sistemas mediante voz. Las principales herramientas incluyen Amazon Alexa, Google Assistant y Apple Siri. Los flujos de conversación son secuencias de interacciones entre el usuario y el sistema. Un buen diseño VUI debe considerar: confirmación de entrada, manejo de errores, personalización y contexto. Las mejores prácticas incluyen pruebas de usuario iterativas, diseño de diálogos naturales y manejo de intenciones ambiguas.' }]
}

console.log('Calling /api/roadmap...')
const res = await fetch('http://localhost:3001/api/roadmap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginData.access_token}` },
  body: JSON.stringify(body)
})
const data = await res.json()
console.log('Status:', res.status)
console.log('Response:', JSON.stringify(data, null, 2).slice(0, 2000))
if (data.count) console.log('Node count:', data.count)
if (data.nodes) {
  for (const n of data.nodes) {
    console.log(`  [${n.position}] ${n.type}: ${n.title} (${(n.content||'').length} chars)`)
  }
}
