import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()

console.log('=== 1. Login as teacher ===')
const supabase = createClient(url, key)
const { data: { session: teacherSession } } = await supabase.auth.signInWithPassword({
  email: 'default_teacher@eduapp.test',
  password: 'teacher123'
})
console.log('Teacher ID:', teacherSession.user.id.slice(0, 8) + '...')

console.log('\n=== 2. Get teacher courses ===')
const { data: courses } = await supabase
  .from('courses')
  .select('id, title, status, invite_code')
  .eq('teacher_id', teacherSession.user.id)
if (!courses?.length) {
  console.log('NO COURSES FOUND! Teacher needs courses first.')
  await supabase.auth.signOut()
  process.exit(0)
}
const course = courses[0]
console.log(`Course: "${course.title}" (${course.status}, code: ${course.invite_code || 'none'})`)

console.log('\n=== 3. Find a student to add ===')
const { data: students } = await supabase
  .from('profiles')
  .select('id, full_name, email, role')
  .eq('role', 'student')
  .limit(5)
console.log(`Found ${students?.length || 0} students`)
const target = students?.find(s => s.email !== 'default_student@eduapp.test') || students?.[0]
if (!target) {
  console.log('No students available')
  await supabase.auth.signOut()
  process.exit(0)
}
console.log(`Target: ${target.full_name} (${target.email})`)

console.log('\n=== 4. Check if already enrolled ===')
const { data: existing } = await supabase
  .from('enrollments')
  .select('*')
  .eq('student_id', target.id)
  .eq('course_id', course.id)
  .maybeSingle()
if (existing) {
  console.log('Already enrolled! Removing for test...')
  await supabase.from('enrollments').delete().eq('id', existing.id)
  console.log('Removed.')
}

console.log('\n=== 5. Teacher adds student (testing RLS fix) ===')
const { data: enrollment, error: addErr } = await supabase
  .from('enrollments')
  .insert({ student_id: target.id, course_id: course.id })
  .select()
  .single()

if (addErr) {
  console.log('ERROR adding student:', addErr.message)
  console.log('Details:', JSON.stringify(addErr))
} else {
  console.log('Student added successfully! Enrollment:', enrollment?.id?.slice(0, 8) + '...')
}

console.log('\n=== 6. Switch to student and verify ===')
await supabase.auth.signOut()
const { data: { session: studentSession } } = await supabase.auth.signInWithPassword({
  email: target.email,
  password: 'student123'
})
console.log('Student ID:', studentSession.user.id.slice(0, 8) + '...')

console.log('\n=== 7. Student sees enrollments ===')
const { data: studentEnrollments } = await supabase
  .from('enrollments')
  .select('id, course_id, courses(id, title, status)')
  .eq('student_id', studentSession.user.id)

const found = studentEnrollments?.find(e => e.course_id === course.id)
if (found) {
  console.log('Student sees the course!', found.courses?.title)
  console.log('Course status:', found.courses?.status)
} else {
  console.log('Student does NOT see the course!')
  console.log('All enrollments:', studentEnrollments?.length || 0)
  studentEnrollments?.forEach(e => console.log('  -', e.courses?.title))
}

console.log('\n=== 8. Student sees roadmap nodes ===')
const { data: nodes } = await supabase
  .from('nodes')
  .select('id, position, type, title, status')
  .eq('course_id', course.id)
  .order('position')

if (nodes?.length > 0) {
  console.log(`${nodes.length} nodes visible:`)
  nodes.forEach(n => console.log(`  [${n.position}] ${n.type}: ${n.title} (${n.status})`))
} else {
  console.log('No nodes visible or course is draft')
}

await supabase.auth.signOut()
console.log('\n=== All tests passed! ===')
