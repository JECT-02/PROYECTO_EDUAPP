const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || 'eduapp-dev-key'

function joinTexts(fileTexts = []) {
  const texts = fileTexts.map(f => (typeof f === 'object' && f.text) ? f.text : (typeof f === 'string' ? f : '')).filter(Boolean)
  return texts.join('\n\n---\n\n').slice(0, 30000)
}

async function callBackend(endpoint, body) {
  const res = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': AI_API_KEY },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`)
  return json
}

export async function generateRoadmapAI({ title, description, category, level, rigor, fileTexts = [] }) {
  let material = joinTexts(fileTexts)
  if (!material || material.trim().length < 50) {
    material = [
      `Curso: ${title || 'Sin titulo'}`,
      category ? `Materia: ${category}` : '',
      level ? `Nivel: ${level}` : '',
      `Rigor academico: ${rigor || 3}`,
      description ? `Descripcion: ${description}` : '',
    ].filter(Boolean).join('\n')
  }
  return callBackend('/api/roadmap', {
    title,
    description: description || `${category ? category + ' — ' : ''}Nivel: ${level || 'general'}, Rigor: ${rigor || 3}`,
    material,
  })
}

export async function askAI({ question, courseTitle, fileTexts = [], history = [] }) {
  return callBackend('/api/ask', {
    question,
    context: `Curso: ${courseTitle}\n${joinTexts(fileTexts)}`,
    history,
  })
}

export async function generateQuizAI({ fileTexts = [], count = 5, courseTitle }) {
  return callBackend('/api/quiz', {
    material: joinTexts(fileTexts),
    count,
    topic: courseTitle || '',
  })
}
