const BACKEND = 'http://localhost:3001'
const API_KEY = 'eduapp-dev-key'

async function post(endpoint, body) {
  const res = await fetch(BACKEND + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status)
  return data
}

const tests = [
  { t: 'llevame a configuracion', c: { page: 'dashboard', courses: ['Python', 'Biologia'] } },
  { t: 'ajustes por favor', c: { page: 'dashboard', courses: ['Python'] } },
  { t: 'settings', c: { page: 'quiz', courses: ['Python'] } },
  { t: 'ultimo nodo de biologia', c: { page: 'dashboard', courses: ['Python', 'Biologia'] } },
  { t: 'continuar donde me quede en Python', c: { page: 'dashboard', courses: ['Python', 'Biologia'] } },
  { t: 'donde estoy', c: { page: 'lesson', courseTitle: 'Python', nodeTitle: 'Variables' } },
  { t: 'que cursos tengo', c: { page: 'dashboard', courses: ['Python', 'Biologia', 'Fisica'] } },
  { t: 'leer la leccion', c: { page: 'lesson', courseTitle: 'Python', nodeTitle: 'Bucles' } },
  { t: 'siguiente leccion', c: { page: 'lesson', courseTitle: 'Python', nodeTitle: 'Variables' } },
  { t: 'regresa al dashboard', c: { page: 'quiz', courses: ['Python'] } },
  { t: 'abrir el curso de Python', c: { page: 'dashboard', courses: ['Python', 'Biologia'] } },
]

async function main() {
  const h = await fetch(BACKEND + '/api/health', { headers: { 'X-API-Key': API_KEY } }).then(r => r.json())
  console.log('Backend: ' + h.status + ' | Groq: ' + (h.groqConfigured ? 'OK' : 'NO') + '\n')

  let ok = 0
  let fail = 0
  for (const x of tests) {
    try {
      const r = await post('/api/voice/categorize', { transcript: x.t, context: x.c })
      console.log('  [OK] "' + x.t + '" -> ' + r.category + '/' + r.action + ' | "' + (r.responseText || '').slice(0, 50) + '"')
      ok++
    } catch (e) {
      console.log('  [FAIL] "' + x.t + '" -> ' + e.message)
      fail++
    }
  }
  console.log('\n' + ok + '/' + (ok + fail) + ' passed')
}

main().catch(e => console.error(e.message))
