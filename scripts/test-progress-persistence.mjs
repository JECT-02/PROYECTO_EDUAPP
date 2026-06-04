// scripts/test-progress-persistence.mjs
// Verifica que el progreso del estudiante se persiste en BD tras logout/login.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function loadDotenv() {
  const envPath = join(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    if (process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadDotenv()

const url = process.env.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const supabase = createClient(url, anon, { auth: { persistSession: false } })

const EMAIL = 'default_student@eduapp.test'
const PASS = 'student123'
const COURSE_INVITE = 'DEMO01'

async function run() {
  console.log(`\n[1/5] Login como ${EMAIL}…`)
  const { data: auth, error: lerr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASS })
  if (lerr) throw new Error(`Login falló: ${lerr.message}`)
  const userId = auth.user.id
  console.log(`   OK · userId=${userId.slice(0, 8)}…`)

  console.log('\n[2/5] Buscar enrollment del curso DEMO01…')
  await new Promise(r => setTimeout(r, 400))
  const { data: courses } = await supabase.from('courses').select('id, title, invite_code').eq('invite_code', COURSE_INVITE).single()
  if (!courses) throw new Error('Curso DEMO01 no existe — ejecuta scripts/seed-test-users.mjs primero')
  const { data: enr, error: eerr } = await supabase.from('enrollments').select('id, course_id, enrolled_at').eq('student_id', userId).eq('course_id', courses.id).single()
  if (eerr || !enr) throw new Error(`No hay enrollment: ${eerr?.message || 'no rows'}`)
  console.log(`   OK · enrollment=${enr.id.slice(0, 8)}… enrolled_at=${enr.enrolled_at}`)

  console.log('\n[3/5] Leer progreso actual…')
  const { data: progressBefore } = await supabase.from('progress').select('node_id, state, score, attempts, completed_at').eq('enrollment_id', enr.id)
  console.log(`   ${(progressBefore || []).length} filas`)
  progressBefore?.forEach(p => console.log(`     · node=${p.node_id.slice(0, 8)} state=${p.state} score=${p.score} attempts=${p.attempts}`))

  console.log('\n[4/5] Marcar primer nodo como completed (idempotente)…')
  const { data: firstNode } = await supabase.from('nodes').select('id, title, position').eq('course_id', courses.id).order('position', { ascending: true }).limit(1).single()
  if (!firstNode) throw new Error('Curso sin nodos')
  const { error: uerr } = await supabase.from('progress').upsert({
    enrollment_id: enr.id,
    node_id: firstNode.id,
    state: 'completed',
    score: 100,
    attempts: 1,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'enrollment_id,node_id' })
  if (uerr) throw new Error(`upsert progress: ${uerr.message}`)
  console.log(`   OK · node ${firstNode.title} → completed`)

  console.log('\n[5/5] Simular logout + login y releer progreso…')
  await supabase.auth.signOut()
  const { error: lerr2 } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASS })
  if (lerr2) throw new Error(`Relogin falló: ${lerr2.message}`)
  await new Promise(r => setTimeout(r, 400))
  const { data: progressAfter } = await supabase.from('progress').select('node_id, state, score, attempts, completed_at').eq('enrollment_id', enr.id)
  const completedAfter = (progressAfter || []).filter(p => p.state === 'completed').length
  const completedBefore = (progressBefore || []).filter(p => p.state === 'completed').length
  console.log(`   Progreso antes: ${completedBefore} completados · después: ${completedAfter} completados`)

  if (completedAfter < completedBefore + 1) {
    throw new Error(`El progreso NO se persistió (esperaba ${completedBefore + 1}, obtuve ${completedAfter})`)
  }
  console.log('\n✅ Progreso persiste correctamente en BD tras logout/login')
}

run().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
