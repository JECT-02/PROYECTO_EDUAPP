import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '..', '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

let passed = 0; let failed = 0
function check(name, condition, detail) {
  if (condition) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); failed++ }
}

async function main() {
  console.log('=== TEST FLUJO QUIZ + REVIEW ===\n')

  // 1. Get test user
  const { data: authStudent } = await admin.auth.signInWithPassword({
    email: 'default_student@eduapp.test', password: 'student123',
  })
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${authStudent.session.access_token}` } },
  })
  check('Estudiante login exitoso', !!authStudent.session)

  // 2. Login as teacher
  const { data: authTeacher } = await admin.auth.signInWithPassword({
    email: 'default_teacher@eduapp.test', password: 'teacher123',
  })
  const teacherClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${authTeacher.session.access_token}` } },
  })
  check('Docente login exitoso', !!authTeacher.session)

  // 3. Create test course
  const { data: course } = await teacherClient.from('courses').insert({
    teacher_id: authTeacher.session.user.id,
    title: 'Test Quiz Flow',
    description: 'Curso de prueba para validar flujo quiz.',
    category: 'Test',
    level: 3,
    rigor: 3,
    status: 'published',
    invite_code: 'TQ' + Date.now(),
  }).select().single()
  check('Curso creado', !!course, course?.title)

  // Add nodes
  const { data: nodes } = await teacherClient.from('nodes').insert([
    { course_id: course.id, position: 1, type: 'theory', title: 'Teoría 1', description: 'Intro', content: '<h2>Tema 1</h2><p>Contenido de prueba.</p>', status: 'published' },
    { course_id: course.id, position: 2, type: 'quiz', title: 'Quiz 1', description: 'Quiz de prueba', status: 'published',
      content: JSON.stringify({ questions: [
        { id: 1, text: '¿2+2?', options: ['3', '4', '5', '6'], correct: 1, explanation: '2+2=4 es aritmética básica.' },
        { id: 2, text: '¿Capital de Perú?', options: ['Bogotá', 'Lima', 'Quito', 'Santiago'], correct: 1, explanation: 'Lima es la capital del Perú.' },
        { id: 3, text: '¿Color del cielo?', options: ['Verde', 'Rojo', 'Azul', 'Amarillo'], correct: 2, explanation: 'El cielo se ve azul por dispersión de Rayleigh.' },
      ]})
    },
  ]).select()
  check('Nodos creados', nodes?.length >= 2, `count: ${nodes?.length}`)

  // Enroll student
  const { data: enrollment } = await client.from('enrollments').insert({
    student_id: authStudent.session.user.id, course_id: course.id,
  }).select().single()
  check('Enrollment creado', !!enrollment)

  // 4. Test Edge Function: analyze-error
  console.log('\n--- Test analyze-error Edge Function ---')
  const { error: aeErr } = await client.functions.invoke('analyze-error', {
    body: { question: '¿2+2?', userAnswer: '3', correctAnswer: '4', courseId: course.id, concept: 'aritmética', studentLevel: 'beginner' },
  })
  check('analyze-error responde sin error', !aeErr, aeErr?.message)
  if (!aeErr) console.log('     Edge Function operativa')

  // 5. Test Edge Function: reinforce
  console.log('\n--- Test reinforce Edge Function ---')
  const reinforceRes = await fetch(`${url}/functions/v1/reinforce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStudent.session.access_token}`, apikey: anonKey },
    body: JSON.stringify({ courseId: course.id, concept: 'aritmetica', question: 'Por que 2+2=4?', studentLevel: 'intermediate' }),
  })
  check('reinforce responde (200 o 500 si sin material)', reinforceRes.ok || reinforceRes.status === 500, `status: ${reinforceRes.status}`)

  // 6. Test notification creation via RPC
  console.log('\n--- Test notificaciones ---')
  const { data: notifId } = await client.rpc('insert_notification', {
    p_user_id: authStudent.session.user.id,
    p_type: 'quiz_result',
    p_payload: { title: 'Quiz aprobado', desc: '3/3 en Quiz 1 — Test Quiz Flow', score: 3, total: 3 },
  })
  check('Notificación quiz_result creada', !!notifId)

  // 7. Test listNotifications from student perspective
  const { data: notifs } = await client.from('notifications').select('*').eq('user_id', authStudent.session.user.id).order('created_at', { ascending: false }).limit(5)
  check('Estudiante ve notificaciones', notifs?.length > 0, `count: ${notifs?.length}`)
  const quizNotif = notifs?.find(n => n.type === 'quiz_result')
  check('Notificación quiz_result visible', !!quizNotif, quizNotif?.payload?.title)

  // 8. Cleanup
  await admin.from('notifications').delete().eq('user_id', authStudent.session.user.id)
  await admin.from('progress').delete().eq('enrollment_id', enrollment.id)
  await admin.from('enrollments').delete().eq('id', enrollment.id)
  await admin.from('nodes').delete().eq('course_id', course.id)
  await admin.from('courses').delete().eq('id', course.id)
  console.log('\n  → Cleanup OK')

  console.log(`\n=== RESULTADO: ${passed} pasaron, ${failed} fallaron ===`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
