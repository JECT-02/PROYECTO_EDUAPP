// scripts/test-ai-roadmap.mjs
// Simulates the teacher flow: sign in → extract PDF → generate roadmap

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const PDF_PATH = join(PROJECT_ROOT, 'vui_sesion01.pdf')
const AI_BACKEND = 'http://localhost:3001'

// Load .env manually
function loadEnv() {
  const envPath = join(PROJECT_ROOT, '.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

function log(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}][${tag}] ${msg}`)
}

function warn(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.error(`[${ts}][${tag}] ⚠ ${msg}`)
}

// ─── Step 1: Sign in as teacher ──────────────────────────────
async function signIn() {
  log('AUTH', 'Signing in as default_teacher@eduapp.test...')
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: 'default_teacher@eduapp.test',
      password: 'teacher123',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    // Try creating the test user if sign-in fails
    warn('AUTH', `Sign-in failed: ${data.error_description || data.msg || 'unknown'}. Trying to create user...`)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: 'default_teacher@eduapp.test',
        password: 'teacher123',
        data: { role: 'teacher', full_name: 'Profesor Default' },
      }),
    })
    const createData = await createRes.json()
    if (createData.access_token) {
      log('AUTH', 'User created and signed in successfully')
      return createData.access_token
    }
    // If auto-confirm isn't on, try signing in anyway after creation
    warn('AUTH', `User creation result: ${JSON.stringify(createData).slice(0, 200)}`)
    const retryRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: 'default_teacher@eduapp.test',
        password: 'teacher123',
      }),
    })
    const retryData = await retryRes.json()
    if (retryData.access_token) {
      log('AUTH', 'Signed in after user creation')
      return retryData.access_token
    }
    throw new Error(`Cannot authenticate: ${JSON.stringify(retryData).slice(0, 300)}`)
  }
  log('AUTH', `Signed in. User: ${data.user?.email}`)
  return data.access_token
}

// ─── Step 2: Extract text from PDF ────────────────────────────
async function extractPDF(token) {
  log('EXTRACT', `Reading PDF: ${PDF_PATH}`)
  const pdfBuffer = readFileSync(PDF_PATH)
  log('EXTRACT', `PDF size: ${pdfBuffer.length} bytes`)

  const formData = new FormData()
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'vui_sesion01.pdf')

  log('EXTRACT', 'Sending to /api/extract...')
  const start = Date.now()
  const res = await fetch(`${AI_BACKEND}/api/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const elapsed = Date.now() - start
  const data = await res.json()

  if (!res.ok) {
    throw new Error(`Extract failed (${res.status}): ${data.error}`)
  }

  log('EXTRACT', `Success in ${elapsed}ms. Extracted ${data.chars} chars from "${data.filename}"`)
  log('EXTRACT', `Preview (first 500 chars):\n${data.text.slice(0, 500)}...`)
  return { text: data.text, filename: data.filename, chars: data.chars }
}

// ─── Step 3: Generate roadmap ─────────────────────────────────
async function generateRoadmap(token, fileTexts) {
  log('ROADMAP', 'Sending to /api/roadmap with file context...')
  const start = Date.now()

  const res = await fetch(`${AI_BACKEND}/api/roadmap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Interfaz de Voz y Usuario',
      description: 'Curso sobre diseño de interfaces de voz y experiencia de usuario',
      category: 'Tecnología',
      level: '15-17',
      rigor: 3,
      fileTexts: [{ filename: fileTexts.filename, text: fileTexts.text.slice(0, 8000) }],
    }),
  })

  const elapsed = Date.now() - start
  const data = await res.json()

  if (!res.ok) {
    throw new Error(`Roadmap generation failed (${res.status}): ${data.error}`)
  }

  log('ROADMAP', `Success in ${(elapsed / 1000).toFixed(1)}s. Generated ${data.count} nodes.`)
  return data
}

// ─── Step 4: Validate roadmap ─────────────────────────────────
function validateRoadmap(data) {
  log('VALIDATE', 'Validating roadmap structure...')

  const issues = []

  if (!data.nodes || !Array.isArray(data.nodes)) {
    issues.push('nodes is not an array')
  }
  if (!data.count || data.count < 5) {
    issues.push(`Expected 5+ nodes, got ${data.count}`)
  }

  const nodes = data.nodes || []
  const types = {}
  let hasContent = 0
  let hasHTML = 0
  let hasQuiz = 0
  let hasBoss = false

  for (const node of nodes) {
    types[node.type] = (types[node.type] || 0) + 1

    if (!node.title) issues.push(`Node at position ${node.position} has no title`)
    if (!node.description) issues.push(`Node at position ${node.position} has no description`)
    if (!node.content) {
      issues.push(`Node "${node.title}" at position ${node.position} has NO CONTENT`)
    } else {
      hasContent++
      if (node.content.includes('<h2>')) hasHTML++
      if (node.type === 'quiz' || node.type === 'boss') {
        try {
          const parsed = JSON.parse(node.content)
          if (parsed.questions) hasQuiz++
        } catch {
          // Quiz content might be double-escaped
        }
      }
    }
    if (node.type === 'boss') hasBoss = true
  }

  log('VALIDATE', `Node types: ${JSON.stringify(types)}`)
  log('VALIDATE', `Nodes with content: ${hasContent}/${nodes.length}`)
  log('VALIDATE', `Nodes with HTML content: ${hasHTML}/${nodes.length}`)
  log('VALIDATE', `Quiz/Boss nodes: ${hasQuiz}`)
  log('VALIDATE', `Has boss node: ${hasBoss}`)

  // Show first node content preview
  if (nodes.length > 0 && nodes[0].content) {
    log('VALIDATE', `First node content preview:\n${nodes[0].content.slice(0, 300)}...`)
  }

  if (issues.length > 0) {
    warn('VALIDATE', `Found ${issues.length} issues:`)
    for (const issue of issues.slice(0, 10)) {
      warn('VALIDATE', `  - ${issue}`)
    }
  } else {
    log('VALIDATE', '✅ All validation checks passed!')
  }

  return { valid: issues.length === 0, issues, stats: { types, hasContent, hasHTML, hasQuiz, hasBoss } }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('  EDUAPP AI ROADMAP - END-TO-END TEST')
  console.log('='.repeat(60) + '\n')

  try {
    // Step 1: Auth
    const token = await signIn()

    // Step 2: Extract PDF
    const extracted = await extractPDF(token)

    // Step 3: Generate roadmap
    const roadmap = await generateRoadmap(token, extracted)

    // Step 4: Validate
    const validation = validateRoadmap(roadmap)

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('  RESULTS SUMMARY')
    console.log('='.repeat(60))
    console.log(`  Nodes generated: ${roadmap.count}`)
    console.log(`  Regulation applied: ${roadmap.regulation_applied}`)
    console.log(`  Validation: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`)
    if (!validation.valid) {
      console.log(`  Issues: ${validation.issues.length}`)
    }
    console.log('='.repeat(60) + '\n')

    // Print full roadmap structure
    console.log('Roadmap structure:')
    for (const node of roadmap.nodes) {
      const contentLen = node.content ? node.content.length : 0
      console.log(`  [${node.position}] ${node.type.padEnd(8)} | ${node.title} | content: ${contentLen} chars`)
    }

    process.exit(validation.valid ? 0 : 1)
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message)
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    process.exit(1)
  }
}

main()
