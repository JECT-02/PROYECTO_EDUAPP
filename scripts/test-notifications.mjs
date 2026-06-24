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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

let passed = 0
let failed = 0
function check(name, condition, detail) {
  if (condition) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); failed++ }
}

async function main() {
  console.log('=== TEST DE NOTIFICACIONES ===\n')

  // 1. Find users
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 50 })
  const parent = users?.users?.find(u => u.email === 'padre.garcia@eduapp.test')
  const student = users?.users?.find(u => u.email === 'ana.garcia@eduapp.test')
  check('Padre existe en DB', !!parent, parent?.email)
  check('Estudiante existe en DB', !!student, student?.email)

  // 2. Clean: delete parent link and notifications
  if (parent && student) {
    await admin.from('parent_links').delete().eq('student_id', student.id)
    await admin.from('notifications').delete().eq('user_id', student.id).eq('type', 'parent_linked')
    await admin.from('notifications').delete().eq('user_id', student.id).eq('type', 'medal')
    console.log('  → Limpiado vínculo y notificaciones previas')

    // 3. Test RPC: check_student_has_parent
    const { data: hasParentBefore } = await admin.rpc('check_student_has_parent', { p_student_id: student.id })
    check('RPC check_student_has_parent → false (sin vinculo)', hasParentBefore === false, `valor: ${hasParentBefore}`)

    // 4. Simulate parent login
    const { data: authData } = await admin.auth.signInWithPassword({
      email: 'padre.garcia@eduapp.test', password: 'parent123',
    })
    const parentClient = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } },
    })

    // Test RPC insert_notification
    const { data: notifId } = await parentClient.rpc('insert_notification', {
      p_user_id: student.id,
      p_type: 'parent_linked',
      p_payload: { title: 'Padre vinculado', desc: 'Test: Sr. García se ha vinculado.' },
    })
    check('RPC insert_notification desde padre → success', !!notifId, `id: ${notifId}`)

    // Verify notification was created
    const { data: notifs } = await admin.from('notifications')
      .select('*').eq('user_id', student.id).eq('type', 'parent_linked')
    check('Notificación parent_linked existe en DB', notifs?.length > 0, `cantidad: ${notifs?.length}`)

    // Cleanup test notification
    if (notifId) await admin.from('notifications').delete().eq('id', notifId)

    // 5. Test via API: direct link creates notification
    const { data: link } = await parentClient
      .from('parent_links')
      .insert({ parent_id: parent.id, student_id: student.id, status: 'accepted' })
      .select('*, parent:parent_id(full_name)')
      .single()
    check('INSERT parent_link desde padre → success', !!link)

    // Manually create notification (simulating requestParentLink)
    const { data: notifId2 } = await parentClient.rpc('insert_notification', {
      p_user_id: student.id,
      p_type: 'parent_linked',
      p_payload: { title: 'Padre vinculado', desc: `${link?.parent?.full_name || 'Tu padre'} se ha vinculado.` },
    })
    check('Notificación creada al vincular', !!notifId2)

    // Verify from student side
    const { data: authDataSt } = await admin.auth.signInWithPassword({
      email: 'ana.garcia@eduapp.test', password: 'student123',
    })
    const studentClient = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${authDataSt.session.access_token}` } },
    })
    const { data: studentNotifs } = await studentClient
      .from('notifications').select('*').eq('user_id', student.id).order('created_at', { ascending: false })
    check('Estudiante ve notificaciones propias', studentNotifs?.length > 0, `cantidad: ${studentNotifs?.length}`)
    const parentNotif = studentNotifs?.find(n => n.type === 'parent_linked')
    check('Estudiante ve notificación parent_linked', !!parentNotif, parentNotif?.payload?.title)

    // 6. Test medal notification
    const { data: medalNotifId } = await studentClient.rpc('insert_notification', {
      p_user_id: student.id,
      p_type: 'medal',
      p_payload: { title: 'Nuevo logro: Primer Paso', desc: 'Has desbloqueado el logro.', medal_name: 'Primer Paso' },
    })
    check('RPC insert_notification (medal) → success', !!medalNotifId)

    const { data: medalNotifs } = await studentClient
      .from('notifications').select('*').eq('user_id', student.id).eq('type', 'medal')
    check('Notificación medal existe en DB', medalNotifs?.length > 0)

    // Cleanup
    await admin.from('notifications').delete().eq('user_id', student.id)
  }

  console.log(`\n=== RESULTADO: ${passed} pasaron, ${failed} fallaron ===`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
