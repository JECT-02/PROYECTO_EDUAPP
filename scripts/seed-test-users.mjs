// scripts/seed-test-users.mjs
// Crea 3 usuarios de prueba (student, teacher, parent) usando service_role.
// Vincula parent con student por defecto (id_as_student).
//
// Requisitos: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, SUPABASE_PROJECT_ID en .env

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env
const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const USERS = [
  {
    email: 'default_student@eduapp.test',
    password: 'student123',
    full_name: 'Default Student',
    dni: '11111111',
    role: 'student',
    age_band: '11-14',
    institution: 'Colegio Demo',
    metadata: { avatar_id: 1, pet_type: 'dragon', pet_name: 'Sparky' },
  },
  {
    email: 'default_teacher@eduapp.test',
    password: 'teacher123',
    full_name: 'Default Teacher',
    dni: '22222222',
    role: 'teacher',
    age_band: '18+',
    institution: 'Colegio Demo',
    subject: 'Biología',
    metadata: {},
  },
  {
    email: 'default_parent@eduapp.test',
    password: 'parent123',
    full_name: 'Default Parent',
    dni: '33333333',
    role: 'parent',
    age_band: '18+',
    institution: 'Colegio Demo',
    relation: 'Padre',
    metadata: {},
  },
]

async function ensureUser(u) {
  const { data: list, error: lErr } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (lErr) throw lErr
  let existing = list?.users?.find((x) => x.email === u.email)
  let userId
  if (existing) {
    userId = existing.id
    console.log(`✓ Existe ${u.email} (id=${userId})`)
    // Actualizar password por si cambió
    await admin.auth.admin.updateUserById(userId, { password: u.password })
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, dni: u.dni, role: u.role, ...u.metadata },
    })
    if (error) throw error
    userId = data.user.id
    console.log(`+ Creado ${u.email} (id=${userId})`)
  }
  return userId
}

async function ensureProfile(userId, u) {
  // upsert manual (el trigger handle_new_user crea uno básico al signup)
  const profile = {
    id: userId,
    full_name: u.full_name,
    role: u.role,
    age_band: u.age_band,
    institution: u.institution,
    institution_short: u.institution,
    email: u.email,
    dni: u.dni,
    password: u.password, // DEMO: se guarda en texto plano para que el usuario pueda verlo
    ...u.metadata,
  }
  if (u.role === 'teacher') profile.subject = u.subject
  if (u.role === 'parent') profile.relation = u.relation
  const { error } = await admin.from('profiles').upsert(profile, { onConflict: 'id' })
  if (error) throw error
  console.log(`  perfil sincronizado (dni=${u.dni}, email=${u.email})`)
  // Guardar dni en user_metadata para acceso desde auth
  await admin.auth.admin.updateUserById(userId, { user_metadata: { dni: u.dni, full_name: u.full_name, role: u.role, ...u.metadata } })
}

async function linkParentToStudent(parentId, studentId) {
  const { error } = await admin.from('parent_links').upsert(
    { parent_id: parentId, student_id: studentId, status: 'accepted' },
    { onConflict: 'parent_id,student_id' }
  )
  if (error) throw error
  console.log(`  parent ↔ student linkeado`)
}

async function seedDemoData(teacherId, studentId) {
  // Curso demo
  let { data: course, error: cErr } = await admin
    .from('courses')
    .select('*')
    .eq('invite_code', 'DEMO01')
    .maybeSingle()
  if (cErr) throw cErr
  if (!course) {
    const { data: created, error: insErr } = await admin
      .from('courses')
      .insert({
        teacher_id: teacherId,
        title: 'Biología Celular (Demo)',
        description: 'Curso de ejemplo. Sube tu PDF para que la IA lo use como material.',
        category: 'Biología',
        level: 3,
        rigor: 3,
        status: 'published',
        invite_code: 'DEMO01',
      })
      .select()
      .single()
    if (insErr) throw insErr
    course = created
  } else {
    await admin.from('courses').update({
      teacher_id: teacherId, title: 'Biología Celular (Demo)', level: 3, rigor: 3, status: 'published',
    }).eq('id', course.id)
  }

  // Enrollment
  const { error: eErr } = await admin
    .from('enrollments')
    .upsert(
      { student_id: studentId, course_id: course.id },
      { onConflict: 'student_id,course_id' }
    )
  if (eErr) throw eErr

  // Nodos demo
  const { data: existingNodes } = await admin
    .from('nodes')
    .select('id, status')
    .eq('course_id', course.id)
  if (!existingNodes || existingNodes.length === 0) {
    const nodes = [
      { course_id: course.id, title: 'Bienvenida', type: 'theory', position: 1, status: 'published', description: 'Introducción al curso.', content: '<h2>¡Bienvenido!</h2><p>Este es un curso demo de Biología Celular. La IA generará contenido real cuando subas un PDF como material.</p>' },
      { course_id: course.id, title: 'La célula', type: 'theory', position: 2, status: 'published', description: 'Conceptos básicos.', content: '<h2>La célula</h2><p>La célula es la unidad básica de la vida. Las células eucariotas tienen núcleo definido y orgánulos como mitocondrias, retículo endoplásmico y aparato de Golgi.</p>' },
      { course_id: course.id, title: 'Quiz introductorio', type: 'quiz', position: 3, status: 'published', description: 'Repaso de los nodos anteriores.', quiz_data: { questions: [
        { id: 1, text: '¿Qué orgánulo produce ATP?', options: ['Núcleo', 'Mitocondria', 'Ribosoma', 'Aparato de Golgi'], correct: 1, explanation: 'La mitocondria produce ATP por respiración celular.' },
        { id: 2, text: '¿Dónde está el ADN en una célula eucariota?', options: ['Citoplasma', 'Núcleo', 'Mitocondria', 'Lisosoma'], correct: 1, explanation: 'El ADN se almacena en el núcleo.' },
      ]}},
      { course_id: course.id, title: 'Membrana plasmática', type: 'theory', position: 4, status: 'published', description: 'Estructura y función.', content: '<h2>Membrana plasmática</h2><p>Bicapa lipídica con proteínas embebidas que controla lo que entra y sale de la célula.</p>' },
      { course_id: course.id, title: 'Examen final', type: 'boss', position: 5, status: 'published', description: 'Desafío final.' },
    ]
    const { error: nErr } = await admin.from('nodes').insert(nodes)
    if (nErr) throw nErr
    console.log(`  ${nodes.length} nodos demo creados`)
  } else {
    // Si ya había nodos (p. ej. de un generate-roadmap anterior) los publicamos
    // para que el estudiante pueda verlos y se pueda registrar progreso.
    const { error: pubErr } = await admin
      .from('nodes')
      .update({ status: 'published' })
      .eq('course_id', course.id)
      .neq('status', 'published')
    if (pubErr) throw pubErr
    console.log(`  ${existingNodes.length} nodos existentes republicados`)
  }

  // Medalla demo
  const { data: existingMedals } = await admin
    .from('medals')
    .select('id')
    .eq('student_id', studentId)
  if (!existingMedals || existingMedals.length === 0) {
    const { error: mErr } = await admin.from('medals').insert({
      student_id: studentId,
      name: 'Primer paso',
      achievement: 'Primer paso',
      rarity: 'common',
      svg_data: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#FCD34D"/><text x="32" y="40" text-anchor="middle" font-size="24">★</text></svg>',
      svg_url: '',
    })
    if (mErr) throw mErr
    console.log(`  medalla demo creada`)
  }

  console.log(`  curso demo: ${course.title} (código de invitación: ${course.invite_code})`)
}

async function main() {
  console.log('--- Creando/actualizando usuarios de prueba ---')
  const ids = {}
  for (const u of USERS) {
    const id = await ensureUser(u)
    ids[u.role] = id
    await ensureProfile(id, u)
  }
  await linkParentToStudent(ids.parent, ids.student)
  await seedDemoData(ids.teacher, ids.student)
  console.log('\n--- Listo ---')
  console.log('Credenciales:')
  console.log('  estudiante → default_student@eduapp.test / student123')
  console.log('  docente    → default_teacher@eduapp.test / teacher123')
  console.log('  padre      → default_parent@eduapp.test / parent123')
}

main().catch((e) => {
  console.error('ERROR:', e.message || e)
  process.exit(1)
})
