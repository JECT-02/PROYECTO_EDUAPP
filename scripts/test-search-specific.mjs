import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()
const s = createClient(url, key)

await s.auth.signInWithPassword({ email: 'default_teacher@eduapp.test', password: 'teacher123' })

const tests = ['default', 'default_student', 'default_student@eduapp.test', 'default_student@']
for (const q of tests) {
  const r = await s.from('profiles')
    .select('email, full_name')
    .or('email.ilike.%' + q + '%,full_name.ilike.%' + q + '%')
    .eq('role', 'student')
    .limit(5)
  console.log('Search "' + q + '": ' + ((r.data || []).length) + ' results')
  r.data?.forEach(x => console.log('  ' + x.full_name + ' | ' + x.email))
}

console.log('\n=== Also check: already-enrolled filtering ===')
const { data: enrolled } = await s.from('enrollments')
  .select('student_id, profiles(email, full_name)')
  .eq('course_id', '07338a04-5f28-4e3b-81b3-e93a13e38b0c')
console.log('Enrolled students:')
enrolled?.forEach(e => console.log('  ' + e.profiles?.full_name + ' | ' + e.profiles?.email))

await s.auth.signOut()
