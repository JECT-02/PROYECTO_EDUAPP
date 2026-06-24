import { streamFunction, callFunction } from './streaming'
import { getAccessToken } from './supabase'

export function getStudentLevel(understandingValue) {
  if (understandingValue == null) return 'intermediate'
  if (understandingValue <= 30) return 'beginner'
  if (understandingValue <= 70) return 'intermediate'
  return 'advanced'
}

export function getStudentTemperature(level) {
  if (level === 'beginner') return 0.7
  if (level === 'advanced') return 0.3
  return 0.5
}

export async function chatWithTutor({ courseId, message, history = [], studentLevel = 'intermediate' }) {
  const accessToken = await getAccessToken()
  return streamFunction({
    name: 'chat',
    body: { courseId, message, history, studentLevel },
    accessToken,
  })
}

export async function generateLesson({ courseId, nodeId }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-lesson', body: { courseId, nodeId }, accessToken })
}

export async function generateQuiz({ courseId, nodeId, count = 4, style = 'adaptive' }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-quiz', body: { courseId, nodeId, count, style }, accessToken })
}

export async function generateTest({ courseId, count = 10 }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-test', body: { courseId, count }, accessToken })
}

export async function generateColiseo({ courseId, count = 10, completedNodes = [] }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-coliseo', body: { courseId, count, completedNodes }, accessToken })
}

export async function generateRoadmap({ courseId, files = [], rigor = 3 }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-roadmap', body: { courseId, files, rigor }, accessToken })
}

export async function generateCourseContent({ courseId, nodeIds }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-course-content', body: { courseId, nodeIds }, accessToken })
}

export async function analyzeError({ question, userAnswer, correctAnswer, courseId, concept, studentLevel = 'intermediate' }) {
  const accessToken = await getAccessToken()
  return callFunction({
    name: 'analyze-error',
    body: { question, userAnswer, correctAnswer, courseId, concept, studentLevel },
    accessToken,
  })
}

export async function analyzeErrorStream({ question, userAnswer, correctAnswer, concept, studentLevel = 'intermediate', onChunk, onDone, onError, signal }) {
  const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'
  const accessToken = await getAccessToken()
  const res = await fetch(`${AI_BACKEND_URL}/api/analyze-error`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ question, userAnswer, correctAnswer, concept, studentLevel }),
    signal,
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`analyze-error error ${res.status}: ${text}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let acc = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const evt of events) {
      const line = evt.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.replace(/^data:\s*/, '')
      if (payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload)
        if (parsed.done) break
        if (parsed.error) {
          onError?.(new Error(parsed.error))
          return
        }
        if (typeof parsed.text === 'string') {
          acc += parsed.text
          onChunk?.(parsed.text)
        }
      } catch {
        if (payload) onChunk?.(payload)
      }
    }
  }
  onDone?.(acc)
  return acc
}

export async function analyzeErrorsBatch({ errors, studentLevel = 'intermediate' }) {
  const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'
  const accessToken = await getAccessToken()
  const res = await fetch(`${AI_BACKEND_URL}/api/analyze-errors-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ errors, studentLevel }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`analyze-errors-batch error ${res.status}: ${text}`)
  }
  const data = await res.json()
  if (data?.error) throw new Error(data.error)
  return data?.explanations || []
}

export async function reinforceConcept({ concept, style = 'simple', courseId, question, courses, studentAnswer, correctAnswer, studentLevel = 'intermediate' }) {
  const accessToken = await getAccessToken()
  const res = await callFunction({
    name: 'reinforce',
    body: { concept, style, courseId, question, courses, studentAnswer, correctAnswer, studentLevel },
    accessToken,
  })
  if (res?.error) throw new Error(res.error)
  return { explanation: res?.text || res?.explanation || res?.delta || '', raw: res }
}

export async function fetchYoutubeTranscript({ url }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'youtube-transcript', body: { url }, accessToken })
}

export async function generateMedalSVG({ name, rarity, studentName }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-medal-svg', body: { name, rarity, studentName }, accessToken })
}

export async function triggerEmbedSource(sourceId) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'embed-source', body: { sourceId }, accessToken })
}

export async function chatRoadmap({ courseId, message, nodes, history = [] }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'chat-roadmap', body: { courseId, message, nodes, history }, accessToken })
}

export async function registerUserSimulated(payload) {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return callFunction({ name: 'register-user', body: payload, accessToken: anonKey })
}
