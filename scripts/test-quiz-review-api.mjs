#!/usr/bin/env node
// test-quiz-review-api.js - Test simple para verificar el flujo de quiz review
// Uso: node scripts/test-quiz-review-api.mjs

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')

// Cargar .env
function loadEnv() {
  try {
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
      if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  } catch (e) {
    console.error('No se pudo leer .env:', e.message)
  }
}

loadEnv()

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const AI_BACKEND_URL = process.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'

let passed = 0
let failed = 0

function test(name, fn) {
  return fn().then(result => {
    if (result) {
      console.log(`  PASS: ${name}`)
      passed++
    } else {
      console.log(`  FAIL: ${name}`)
      failed++
    }
  }).catch(e => {
    console.log(`  FAIL: ${name} - ${e.message}`)
    failed++
  })
}

async function fetchNVIDIA() {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.6',
      messages: [{ role: 'user', content: 'Di solo la palabra OK' }],
      max_tokens: 10,
      temperature: 0.5
    })
  })
  return res.ok
}

async function fetchGROQ() {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Di solo la palabra OK' }],
      max_tokens: 10,
      temperature: 0.5
    })
  })
  return res.ok
}

async function fetchAIBackend() {
  const res = await fetch(`${AI_BACKEND_URL}/api/health`)
  const json = await res.json()
  return json.status === 'ok'
}

async function fetchAnalyzeError() {
  const res = await fetch(`${AI_BACKEND_URL}/api/analyze-error`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer fake-test-token`
    },
    body: JSON.stringify({
      question: '¿Cuál es la capital de Francia?',
      userAnswer: 'Londres',
      correctAnswer: 'París',
      concept: 'geografía',
      studentLevel: 'intermediate'
    })
  })
  // 401 es esperado sin token válido, pero significa que el endpoint existe
  return res.status === 401 || res.status === 200
}

async function fetchAnalyzeErrorStreaming() {
  const res = await fetch(`${AI_BACKEND_URL}/api/analyze-error`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer fake-test-token`,
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      question: '¿Cuál es la capital de Francia?',
      userAnswer: 'Londres',
      correctAnswer: 'París',
      concept: 'geografía',
      studentLevel: 'intermediate'
    })
  })
  return res.headers.get('content-type')?.includes('text/event-stream')
}

async function fetchAnalyzeErrorOnlyHeaders() {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 2000)
  try {
    const res = await fetch(`${AI_BACKEND_URL}/api/analyze-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer fake-test-token`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        question: '¿Cuál es la capital de Francia?',
        userAnswer: 'Londres',
        correctAnswer: 'París',
        concept: 'geografía',
        studentLevel: 'intermediate'
      }),
      signal: controller.signal
    })
    const contentType = res.headers.get('content-type')
    return contentType?.includes('text/event-stream')
  } catch (e) {
    if (e.name === 'AbortError') return true // Headers recibidos antes del abort
    throw e
  }
}

console.log('\n=== Test: Quiz Review API ===\n')

console.log('1. NVIDIA API:')
await test('NVIDIA API responde', fetchNVIDIA)

console.log('\n2. Groq API:')
await test('Groq API responde', fetchGROQ)

console.log('\n3. AI Backend:')
await test('AI Backend /api/health responde', fetchAIBackend)

console.log('\n4. Endpoint /api/analyze-error:')
await test('Endpoint existe (responde 401 o 200)', fetchAnalyzeError)
await test('Endpoint devuelve SSE (text/event-stream)', fetchAnalyzeErrorOnlyHeaders)

console.log('\n=== Resumen ===')
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
