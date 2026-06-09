import { supabase } from './supabase'

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

async function callBackend(endpoint, body) {
  const token = await getAccessToken()
  const res = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`)
  return json
}

export async function extractFile(file) {
  const token = await getAccessToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${AI_BACKEND_URL}/api/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`)
  return json
}

export async function generateRoadmapAI({ title, description, category, level, rigor, fileTexts = [] }) {
  return callBackend('/api/roadmap', { title, description, category, level, rigor, fileTexts })
}

export async function askAI({ question, courseTitle, fileTexts = [], history = [] }) {
  return callBackend('/api/ask', { question, courseTitle, fileTexts, history })
}

export async function generateQuizAI({ fileTexts = [], count = 5, courseTitle }) {
  return callBackend('/api/quiz', { fileTexts, count, courseTitle })
}
