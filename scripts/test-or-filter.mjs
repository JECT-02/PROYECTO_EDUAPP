import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf8')
const s = createClient(
  env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim(),
  env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()
)

await s.auth.signInWithPassword({ email: 'default_teacher@eduapp.test', password: 'teacher123' })

// Test with % (old) and * (new)
const tests = [
  ['%', 'email.ilike.%default_student@eduapp.test%,full_name.ilike.%default_student@eduapp.test%'],
  ['*', 'email.ilike.*default_student@eduapp.test*,full_name.ilike.*default_student@eduapp.test*'],
]

for (const [label, filter] of tests) {
  const r = await s.from('profiles')
    .select('email, full_name')
    .or(filter)
    .eq('role', 'student')
    .limit(5)
  console.log('or() with ' + label + ': ' + (r.data?.length || 0) + ' results, error=' + (r.error?.message || 'none'))
  if (r.data) r.data.forEach(x => console.log('  ' + x.email + ' | ' + x.full_name))
}

// Test the exact searchStudents code path
const q = 'default_student@eduapp.test'
const pattern = '*' + q + '*'
console.log('\nPattern: ' + pattern)
const r2 = await s.from('profiles')
  .select('id, full_name, email, dni, role, avatar_id, pet_name, pet_type')
  .or('email.ilike.' + pattern + ',dni.ilike.' + pattern + ',full_name.ilike.' + pattern)
  .eq('role', 'student')
  .limit(5)
console.log('Results: ' + (r2.data?.length || 0) + ', error: ' + (r2.error?.message || 'none'))
r2.data?.forEach(x => console.log('  ' + x.full_name + ' | ' + x.email + ' | ' + (x.dni || 'no dni')))

await s.auth.signOut()
