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
  { t: 'leer notificaciones', c: { page: 'dashboard', courses: ['Python'] } },
  { t: 'que logros tengo', c: { page: 'dashboard', courses: ['Python'] } },
  { t: 'mis medallas', c: { page: 'achievements', courses: ['Python'] } },
  { t: 'cuantos nodos tengo', c: { page: 'roadmap', courseTitle: 'Python', nodePosition: 3, totalNodes: 8 } },
  { t: 'progreso del curso', c: { page: 'lesson', courseTitle: 'Python', nodePosition: 5, totalNodes: 8 } },
  { t: 'ultimo nodo disponible', c: { page: 'roadmap', courseTitle: 'Python', courses: ['Python'], nodePosition: 3, totalNodes: 8 } },
  { t: 'ultimo nodo pendiente de biologia', c: { page: 'dashboard', courses: ['Python', 'Biologia'] } },
  { t: 'leer la pregunta', c: { page: 'quiz', options: ['Rojo', 'Azul', 'Verde', 'Amarillo'], nodeTitle: 'Color del cielo' } },
  { t: 'alternativas', c: { page: 'quiz', options: ['Perro', 'Gato', 'Pez', 'Ave'] } },
  { t: 'marco la B', c: { page: 'quiz', options: ['X', 'Y', 'Z', 'W'] } },
  { t: 'creo que es la primera', c: { page: 'quiz', options: ['Op1', 'Op2', 'Op3', 'Op4'] } },
]

async function main() {
  const h = await fetch(BACKEND + '/api/health', { headers: { 'X-API-Key': API_KEY } }).then(r => r.json())
  console.log('Backend: ' + h.status + ' | Groq: ' + (h.groqConfigured ? 'OK' : 'NO') + '\n')
  let ok = 0; let fail = 0
  for (const x of tests) {
    try {
      const r = await post('/api/voice/categorize', { transcript: x.t, context: x.c })
      console.log('  [OK] "' + x.t + '" -> ' + r.category + '/' + r.action)
      ok++
    } catch (e) {
      console.log('  [FAIL] "' + x.t + '" -> ' + e.message)
      fail++
    }
  }
  console.log('\n' + ok + '/' + (ok + fail) + ' passed')
}
main().catch(e => console.error(e.message))
