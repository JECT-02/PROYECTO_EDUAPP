import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()
const supabase = createClient(url, key)

const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'default_teacher@eduapp.test',
  password: 'teacher123'
})

console.log('=== Students in DB ===')
const { data: students } = await supabase
  .from('profiles')
  .select('id, full_name, email, role')
  .eq('role', 'student')
  .limit(10)
console.log('Total students:', (students || []).length)
students?.forEach(s => console.log(`  ${s.full_name} | ${s.email} | id:${s.id.slice(0, 8)}...`))

console.log('\n=== Search "default" ===')
const { data: results } = await supabase
  .from('profiles')
  .select('id, full_name, email, role')
  .or('email.ilike.%default%,full_name.ilike.%default%')
  .eq('role', 'student')
  .limit(5)
console.log('Results:', (results || []).length)
results?.forEach(s => console.log(`  ${s.full_name} | ${s.email}`))

console.log('\n=== Test enrollments ===')
const { data: enr } = await supabase
  .from('enrollments')
  .select('id, student_id, course_id')
  .limit(5)
console.log('Enrollments:', (enr || []).length)
enr?.forEach(e => console.log(`  student:${e.student_id.slice(0, 8)}... course:${e.course_id.slice(0, 8)}...`))

await supabase.auth.signOut()
console.log('\nDone.')
