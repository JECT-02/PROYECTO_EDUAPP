import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const KEY = env.NVIDIA_API_KEY || env.VITE_NVIDIA_API_KEY
console.log('Key exists:', !!KEY, 'length:', KEY?.length)

const start = Date.now()
const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
  body: JSON.stringify({
    model: 'moonshotai/kimi-k2.6',
    messages: [
      { role: 'system', content: 'Responde SOLO con JSON valido. Sin markdown.' },
      { role: 'user', content: 'Genera un JSON con exactamente 2 nodos: [{"position":1,"type":"theory","title":"Intro","content":"<p>Hola mundo</p>"},{"position":2,"type":"boss","title":"Final","content":"{\\"questions\\":[]}"}]' }
    ],
    temperature: 0.3,
    max_tokens: 1024
  })
})
console.log('Status:', res.status)
const text = await res.text()
console.log('Time:', Date.now() - start, 'ms')
console.log('Response (first 2000):', text.slice(0, 2000))
