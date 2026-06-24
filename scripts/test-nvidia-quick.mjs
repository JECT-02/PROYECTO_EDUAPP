import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const lines = readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')
for (const line of lines) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const KEY = process.env.VITE_NVIDIA_API_KEY
console.log('API Key:', KEY.slice(0, 12) + '...')
console.log('Testing NVIDIA API with a tiny request...')

const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
  body: JSON.stringify({
    model: 'moonshotai/kimi-k2.6',
    messages: [{ role: 'user', content: 'Responde solo: hola mundo' }],
    temperature: 0.6,
    max_tokens: 50,
  }),
})

console.log('Status:', res.status)
const json = await res.json()
console.log('Response:', JSON.stringify(json, null, 2).slice(0, 500))
