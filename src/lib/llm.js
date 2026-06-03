import { streamFunction, callFunction } from './streaming'
import { getAccessToken } from './supabase'

export async function chatWithTutor({ courseId, message, history = [] }) {
  const accessToken = await getAccessToken()
  return streamFunction({
    name: 'chat',
    body: { courseId, message, history },
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

export async function generateColiseo({ courseId, count = 20 }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-coliseo', body: { courseId, count }, accessToken })
}

export async function generateRoadmap({ courseId, files = [], rigor = 3 }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'generate-roadmap', body: { courseId, files, rigor }, accessToken })
}

export async function analyzeError({ question, userAnswer, correctAnswer, courseId, concept }) {
  const accessToken = await getAccessToken()
  return callFunction({
    name: 'analyze-error',
    body: { question, userAnswer, correctAnswer, courseId, concept },
    accessToken,
  })
}

export async function reinforceConcept({ concept, style = 'simple', courseId }) {
  const accessToken = await getAccessToken()
  return callFunction({ name: 'reinforce', body: { concept, style, courseId }, accessToken })
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

export async function registerUserSimulated(payload) {
  // Bypasea la verificación de correo: cualquier OTP de 6 dígitos será válido.
  return callFunction({ name: 'register-user', body: payload, accessToken: null })
}
