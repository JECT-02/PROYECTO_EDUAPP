import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const TEACHERS = [
  { email: 'maria.lopez@eduapp.test', password: 'teacher123', full_name: 'Prof. María López', dni: '44444444', institution: 'Colegio Nacional', subject: 'Matemáticas' },
  { email: 'carlos.ruiz@eduapp.test', password: 'teacher123', full_name: 'Prof. Carlos Ruiz', dni: '55555555', institution: 'Instituto Técnico', subject: 'Historia' },
]

const STUDENTS = [
  { email: 'ana.garcia@eduapp.test', password: 'student123', full_name: 'Ana García', dni: '66666666', age_band: '15-17', institution: 'Colegio Nacional' },
  { email: 'luis.martinez@eduapp.test', password: 'student123', full_name: 'Luis Martínez', dni: '77777777', age_band: '11-14', institution: 'Colegio Nacional' },
  { email: 'sofia.torres@eduapp.test', password: 'student123', full_name: 'Sofía Torres', dni: '88888888', age_band: '15-17', institution: 'Instituto Técnico' },
  { email: 'diego.vargas@eduapp.test', password: 'student123', full_name: 'Diego Vargas', dni: '99999999', age_band: '18+', institution: 'Instituto Técnico' },
  { email: 'valeria.rios@eduapp.test', password: 'student123', full_name: 'Valeria Ríos', dni: '10101010', age_band: '11-14', institution: 'Colegio Nacional' },
]

const PARENTS = [
  { email: 'padre.garcia@eduapp.test', password: 'parent123', full_name: 'Sr. García', dni: '11000001', relation: 'Padre' },
  { email: 'padre.martinez@eduapp.test', password: 'parent123', full_name: 'Sr. Martínez', dni: '11000002', relation: 'Padre' },
  { email: 'madre.torres@eduapp.test', password: 'parent123', full_name: 'Sra. Torres', dni: '11000003', relation: 'Madre' },
  { email: 'padre.vargas@eduapp.test', password: 'parent123', full_name: 'Sr. Vargas', dni: '11000004', relation: 'Padre' },
]

async function ensureUser(u) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
  let existing = list?.users?.find((x) => x.email === u.email)
  let userId
  if (existing) {
    userId = existing.id
    console.log(`  ✓ existe ${u.email}`)
    await admin.auth.admin.updateUserById(userId, { password: u.password })
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, dni: u.dni, role: u.role },
    })
    if (error) throw error
    userId = data.user.id
    console.log(`  + creado ${u.email}`)
  }
  return userId
}

async function ensureProfile(userId, u) {
  const profile = {
    id: userId,
    full_name: u.full_name,
    role: u.role,
    age_band: u.age_band || '18+',
    institution: u.institution || 'Colegio Demo',
    institution_short: u.institution || 'DEMO',
    email: u.email,
    dni: u.dni,
    password: u.password,
  }
  if (u.role === 'teacher') profile.subject = u.subject
  if (u.role === 'parent') profile.relation = u.relation
  const { error } = await admin.from('profiles').upsert(profile, { onConflict: 'id' })
  if (error) throw error
  console.log(`    perfil OK`)
}

async function linkParentToStudent(parentId, studentId) {
  // Check if student already has an accepted parent
  const { data: existing } = await admin
    .from('parent_links')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'accepted')
    .maybeSingle()
  if (existing) {
    console.log(`    ⚠ estudiante ya tiene padre vinculado, omitiendo`)
    return
  }
  const { error } = await admin
    .from('parent_links')
    .upsert({ parent_id: parentId, student_id: studentId, status: 'accepted' }, { onConflict: 'parent_id,student_id' })
  if (error) throw error
  console.log(`    padre ↔ estudiante vinculado (aceptado)`)
}

async function main() {
  console.log('--- Creando profesores ---')
  const teacherIds = []
  for (const t of TEACHERS) {
    t.role = 'teacher'
    const id = await ensureUser(t)
    teacherIds.push(id)
    await ensureProfile(id, t)
  }

  console.log('\n--- Creando estudiantes ---')
  const studentIds = []
  for (const s of STUDENTS) {
    s.role = 'student'
    const id = await ensureUser(s)
    studentIds.push(id)
    await ensureProfile(id, s)
  }

  console.log('\n--- Creando padres (sin vincular) ---')
  for (const p of PARENTS) {
    p.role = 'parent'
    const id = await ensureUser(p)
    await ensureProfile(id, p)
    console.log(`  ${p.email} — ${p.full_name} (DNI: ${p.dni}) — NO vinculado`)
  }

  console.log('\n--- RESUMEN DE CUENTAS ---')
  console.log('\nProfesores:')
  for (const t of TEACHERS) console.log(`  ${t.email} / ${t.password} — ${t.full_name} (${t.subject})`)
  console.log('\nEstudiantes:')
  for (const s of STUDENTS) console.log(`  ${s.email} / ${s.password} — ${s.full_name} (DNI: ${s.dni})`)
  console.log('\nPadres (vinculados):')
  for (let i = 0; i < PARENTS.length; i++) {
    const p = PARENTS[i]
    const s = i < STUDENTS.length ? STUDENTS[i] : null
    console.log(`  ${p.email} / ${p.password} — ${p.full_name}${s ? ` → vinculado a ${s.full_name}` : ''}`)
  }
  console.log(`\n  default_parent@eduapp.test / parent123 — Padre/Madre Demo → vinculado a Estudiante Demo`)
  console.log('\nHecho.')
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1) })
