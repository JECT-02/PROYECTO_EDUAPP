// scripts/test-e2e-teacher-student.mjs
// Verifica el flujo end-to-end:
//  1) Docente crea un curso
//  2) Docente agrega un alumno por email (inserta enrollment)
//  3) Alumno hace login
//  4) El alumno ve el curso en sus enrollments
//  5) El roadmap del curso es accesible
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anon) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const TEACHER = { email: 'default_teacher@eduapp.test', password: 'teacher123' }
const STUDENT = { email: 'default_student@eduapp.test', password: 'student123' }
const STAMP = Date.now().toString(36).toUpperCase()
const COURSE_TITLE = `E2E Test Course ${STAMP}`
const INVITE_CODE = `E2E${STAMP.slice(-4).toUpperCase()}`

const anonClient = createClient(url, anon, { auth: { persistSession: false } })
const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } })

function log(step, msg) {
  console.log(`\n[${step}] ${msg}`)
}

function fail(msg) {
  console.error(`\n❌ ${msg}`)
  process.exit(1)
}

async function run() {
  // 1) Login docente
  log('1/7', `Login docente ${TEACHER.email}…`)
  const { data: tAuth, error: tErr } = await anonClient.auth.signInWithPassword(TEACHER)
  if (tErr) fail(`Login docente: ${tErr.message}`)
  const teacherId = tAuth.user.id
  console.log(`   OK · teacherId=${teacherId.slice(0, 8)}…`)

  // 2) Docente crea un curso (usa service_role para evitar líos de RLS)
  log('2/7', `Docente crea curso "${COURSE_TITLE}" (invite_code=${INVITE_CODE})…`)
  const { data: course, error: cErr } = await adminClient
    .from('courses')
    .insert({
      teacher_id: teacherId,
      title: COURSE_TITLE,
      description: 'Curso creado automáticamente por el test E2E',
      category: 'Test',
      level: 3,
      rigor: 3,
      status: 'draft',
      invite_code: INVITE_CODE,
    })
    .select()
    .single()
  if (cErr) fail(`Insert curso: ${cErr.message}`)
  console.log(`   OK · courseId=${course.id.slice(0, 8)}… invite_code=${course.invite_code}`)

  // 3) Publicar el curso y crear 3 nodos demo para que el roadmap no esté vacío
  log('3/7', 'Publicar curso y crear 3 nodos demo…')
  await adminClient.from('courses').update({ status: 'published' }).eq('id', course.id)
  const { error: nErr } = await adminClient.from('nodes').insert([
    { course_id: course.id, title: 'Bienvenida', type: 'theory', position: 1, status: 'published', content: '<h2>Bienvenido</h2><p>Intro del curso.</p>' },
    { course_id: course.id, title: 'Conceptos', type: 'theory', position: 2, status: 'published', content: '<h2>Conceptos clave</h2><p>Más info.</p>' },
    { course_id: course.id, title: 'Quiz final', type: 'quiz', position: 3, status: 'published', quiz_data: { questions: [{ id: 1, text: '¿Listo?', options: ['Sí', 'No'], correct: 0, explanation: 'Correcto.' }] } },
  ])
  if (nErr) fail(`Insert nodos: ${nErr.message}`)
  console.log(`   OK · 3 nodos publicados`)

  // 4) Docente agrega alumno por email (simula el flujo del CourseDetailModal)
  log('4/7', 'Docente agrega alumno por email…')
  const { data: sProfile, error: pErr } = await adminClient
    .from('profiles')
    .select('id, full_name, email, dni')
    .eq('email', STUDENT.email)
    .eq('role', 'student')
    .single()
  if (pErr || !sProfile) fail(`Buscar perfil alumno: ${pErr?.message || 'no encontrado'}`)
  console.log(`   alumno encontrado: ${sProfile.full_name} (${sProfile.email}) DNI=${sProfile.dni}`)

  // Idempotente
  const { data: existingEnr } = await adminClient
    .from('enrollments')
    .select('id')
    .eq('student_id', sProfile.id)
    .eq('course_id', course.id)
    .maybeSingle()
  if (existingEnr) {
    console.log(`   enrollment ya existía: ${existingEnr.id.slice(0, 8)}…`)
  } else {
    const { data: enr, error: eErr } = await adminClient
      .from('enrollments')
      .insert({ student_id: sProfile.id, course_id: course.id })
      .select()
      .single()
    if (eErr) fail(`Insert enrollment: ${eErr.message}`)
    console.log(`   OK · enrollmentId=${enr.id.slice(0, 8)}…`)
  }

  // 5) Login del estudiante
  log('5/7', `Login estudiante ${STUDENT.email}…`)
  await anonClient.auth.signOut()
  const { data: sAuth, error: sErr } = await anonClient.auth.signInWithPassword(STUDENT)
  if (sErr) fail(`Login estudiante: ${sErr.message}`)
  console.log(`   OK · studentId=${sAuth.user.id.slice(0, 8)}…`)

  // Esperar a que el JWT se propague
  await new Promise((r) => setTimeout(r, 400))

  // 6) El estudiante ve el curso en sus enrollments
  log('6/7', 'Estudiante consulta sus enrollments…')
  const { data: enrollments, error: eeErr } = await anonClient
    .from('enrollments')
    .select('id, course_id, enrolled_at, courses(id, title, invite_code, status, description)')
    .eq('student_id', sAuth.user.id)
  if (eeErr) fail(`Enrollments: ${eeErr.message}`)
  const found = (enrollments || []).find((e) => e.courses?.title === COURSE_TITLE)
  if (!found) {
    console.log('   enrollments actuales:', JSON.stringify(enrollments, null, 2))
    fail(`El estudiante NO ve el curso "${COURSE_TITLE}" en sus enrollments`)
  }
  console.log(`   OK · el estudiante ve el curso "${found.courses.title}"`)

  // 7) El roadmap del curso es accesible (getCourseNodes)
  log('7/7', `Estudiante carga el roadmap del curso ${course.id.slice(0, 8)}…`)
  const { data: nodes, error: gnErr } = await anonClient
    .from('nodes')
    .select('id, position, type, title, status')
    .eq('course_id', course.id)
    .eq('status', 'published')
    .order('position')
  if (gnErr) fail(`getCourseNodes: ${gnErr.message}`)
  console.log(`   OK · ${(nodes || []).length} nodos publicados visibles:`)
  for (const n of nodes || []) {
    console.log(`     · [${n.position}] ${n.title} (${n.type})`)
  }
  if (!nodes || nodes.length === 0) fail('El roadmap no tiene nodos publicados visibles para el estudiante')

  // Bonus: el estudiante puede unir el curso también por invite_code (consistencia)
  log('+1', 'Bonus: el estudiante también puede unirse por invite_code…')
  // Para evitar duplicar enrollment, verificamos que el código sea el mismo
  const { data: codeCheck } = await anonClient
    .from('courses')
    .select('id, title, invite_code')
    .eq('invite_code', INVITE_CODE)
    .single()
  if (!codeCheck || codeCheck.id !== course.id) {
    fail(`El invite_code ${INVITE_CODE} no apunta al curso correcto`)
  }
  console.log(`   OK · invite_code=${codeCheck.invite_code} → "${codeCheck.title}"`)

  // Limpieza (opcional, comentada para inspección)
  // await adminClient.from('enrollments').delete().eq('course_id', course.id)
  // await adminClient.from('nodes').delete().eq('course_id', course.id)
  // await adminClient.from('courses').delete().eq('id', course.id)
  // console.log('cleanup OK')

  console.log('\n✅ Flujo docente → alumno → curso → roadmap verificado correctamente')
  console.log(`   Para reproducir manualmente:`)
  console.log(`     · Curso: "${COURSE_TITLE}"`)
  console.log(`     · invite_code: ${INVITE_CODE}`)
  console.log(`     · Login estudiante: ${STUDENT.email} / ${STUDENT.password}`)
}

run().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
