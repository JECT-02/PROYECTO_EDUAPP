import { supabase, isSupabaseConfigured, requireSession } from './supabase'
import { notifyCourseEnrolled, notifyTeacherNewStudent } from './notifications'

const FALLBACK = (data) => ({ data, error: null, mocked: true })

const NULL_ERR = (op) => ({ data: null, error: new Error('Supabase no configurado. Operación omitida: ' + op), mocked: true })

function g(table) {
  if (!isSupabaseConfigured) return NULL_ERR(`from(${table})`)
  return null
}

export async function getProfile(userId) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return { data, error }
}

export async function updateProfile(userId, updates) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single()
  return { data, error }
}

export async function updateProfileXP(userId, totalXp) {
  return updateProfile(userId, { pet_xp: totalXp })
}

export async function listPublishedCourses({ search = '', limit = 50 } = {}) {
  if (!isSupabaseConfigured) return FALLBACK([])
  let q = supabase.from('courses').select('id, title, description, category, level, cover_url, rigor, created_at, profiles:teacher_id(full_name)').eq('status', 'published').order('created_at', { ascending: false }).limit(limit)
  if (search) q = q.ilike('title', `%${search}%`)
  const { data, error } = await q
  return { data: data || [], error }
}

export async function getCourseWithNodes(courseId) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase
    .from('courses')
    .select('*, nodes(*), profiles:teacher_id(full_name, avatar_id, pet_type, pet_name)')
    .eq('id', courseId)
    .single()
  return { data, error }
}

export async function getCourseNodes(courseId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('nodes')
    .select('id, course_id, position, type, title, description, content, status')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .order('position', { ascending: true })
  return { data: data || [], error }
}

export async function getTeacherCourses(teacherId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('courses')
    .select('*, nodes(id, status), enrollments(id, student_id, enrolled_at, profiles!student_id(full_name, email, dni, avatar_id))')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createCourse(payload) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase.from('courses').insert(payload).select().single()
  return { data, error }
}

export async function deleteCourse(courseId) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase.from('courses').delete().eq('id', courseId)
  return { data, error }
}

export async function updateNode(nodeId, updates) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase.from('nodes').update(updates).eq('id', nodeId).select().single()
  return { data, error }
}

export async function listPendingReviewNodes(teacherId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('nodes')
    .select('id, course_id, position, type, title, description, content, status, courses!inner(id, title, teacher_id)')
    .eq('status', 'pending_review')
    .eq('courses.teacher_id', teacherId)
    .order('position', { ascending: true })
  return { data: data || [], error }
}

export async function enrollStudent({ studentId, inviteToken }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  // Buscar por invite_code (nuevo) o invite_token (viejo) para compatibilidad
  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select('id, teacher_id, status, invite_code, invite_token')
    .or(`invite_code.eq.${inviteToken},invite_token.eq.${inviteToken}`)
    .eq('status', 'published')
    .single()
  if (cErr || !course) return { data: null, error: cErr || new Error('Curso no encontrado o código inválido') }
  // Idempotente: si ya existe el enrollment, devuélvelo
  const { data: existing } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', course.id)
    .maybeSingle()
  if (existing) return { data: existing, error: null }
  const { data, error } = await supabase
    .from('enrollments')
    .insert({ student_id: studentId, course_id: course.id })
    .select()
    .single()
  if (!error && data) {
    notifyCourseEnrolled(studentId, course.title || 'Curso', null).catch(() => {})
    if (course.teacher_id) {
      notifyTeacherNewStudent(course.teacher_id, 'Un estudiante', course.title || 'Curso').catch(() => {})
    }
  }
  return { data, error }
}

/**
 * El docente agrega manualmente a un estudiante a su curso (sin código).
 * Se usa en CourseDetailModal. Crea enrollment si no existe.
 */
export async function addStudentToCourse({ courseId, studentId }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  // Verificar que el curso existe
  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select('id, status')
    .eq('id', courseId)
    .single()
  if (cErr || !course) return { data: null, error: cErr || new Error('Curso no encontrado') }
  // Idempotente
  const { data: existing } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle()
  if (existing) return { data: existing, error: null }
  // Insertar (el curso se publica automáticamente al agregar un alumno)
  if (course.status !== 'published') {
    await supabase.from('courses').update({ status: 'published' }).eq('id', courseId)
  }
  const { data, error } = await supabase
    .from('enrollments')
    .insert({ student_id: studentId, course_id: courseId })
    .select()
    .single()
  if (!error && data) {
    notifyCourseEnrolled(studentId, course.title || 'Curso', null).catch(() => {})
  }
  return { data, error }
}

/**
 * Buscar un perfil de estudiante por email o DNI.
 * Devuelve hasta 5 resultados.
 */
export async function searchStudents(query) {
  if (!isSupabaseConfigured || !query?.trim()) return FALLBACK([])
  const q = query.trim()
  const pattern = `*${q}*`
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, dni, role, avatar_id, pet_name, pet_type')
    .or(`email.ilike.${pattern},dni.ilike.${pattern},full_name.ilike.${pattern}`)
    .eq('role', 'student')
    .limit(5)
  if (error) console.warn('[searchStudents]', error)
  return { data: data || [], error }
}

/**
 * Lista los estudiantes inscritos en un curso con su progreso (completados/total nodos).
 * Usado por CourseDetailModal para mostrar participantes reales.
 */
export async function getCourseEnrollmentsWithProgress(courseId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data: enr, error: eErr } = await supabase
    .from('enrollments')
    .select('id, student_id, enrolled_at, profiles!inner(id, full_name, email, dni, avatar_id, pet_name, pet_type)')
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false })
  if (eErr) return { data: [], error: eErr }

  // Total de nodos publicados del curso (para calcular %)
  const { data: nodes } = await supabase
    .from('nodes')
    .select('id')
    .eq('course_id', courseId)
    .eq('status', 'published')

  const totalNodes = (nodes || []).length
  const result = []
  for (const row of (enr || [])) {
    const { data: prog } = await supabase
      .from('progress')
      .select('state, score, completed_at, node_id')
      .eq('enrollment_id', row.id)
    const completed = (prog || []).filter((p) => p.state === 'completed').length
    const lastCompleted = (prog || [])
      .filter((p) => p.completed_at)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0]
    result.push({
      enrollmentId: row.id,
      studentId: row.student_id,
      enrolledAt: row.enrolled_at,
      fullName: row.profiles?.full_name || 'Estudiante',
      email: row.profiles?.email || '',
      dni: row.profiles?.dni || '',
      avatar: row.profiles?.avatar_id || '🦊',
      petName: row.profiles?.pet_name || '',
      petType: row.profiles?.pet_type || '',
      progress: totalNodes > 0 ? Math.round((completed / totalNodes) * 100) : 0,
      completedNodes: completed,
      totalNodes,
      lastActive: lastCompleted?.completed_at || row.enrolled_at,
    })
  }
  return { data: result, error: null }
}

export async function getStudentEnrollments(studentId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, course_id, enrolled_at, courses(id, title, description, level, cover_url, profiles:teacher_id(full_name))')
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false })
  return { data: data || [], error }
}

export async function getProgressForEnrollment(enrollmentId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('progress')
    .select('id, node_id, state, score, attempts, completed_at')
    .eq('enrollment_id', enrollmentId)
  return { data: data || [], error }
}

export async function markNodeProgress({ enrollmentId, nodeId, state, score, completed = false }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const payload = {
    enrollment_id: enrollmentId,
    node_id: nodeId,
    state: state || 'completed',
    score,
    completed_at: completed ? new Date().toISOString() : null,
  }
  const { data, error } = await supabase
    .from('progress')
    .upsert(payload, { onConflict: 'enrollment_id,node_id' })
    .select()
    .single()
  return { data, error }
}

export async function listStudentMedals(studentId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('medals')
    .select('id, medal_type, name, achievement, rarity, svg_url, unlocked_at')
    .eq('student_id', studentId)
    .order('unlocked_at', { ascending: false })
  return { data: data || [], error }
}

export async function getUnderstandingData(studentId, courseId) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data: enrollment, error: eErr } = await supabase
    .from('enrollments')
    .select('id, ai_interactions, study_time_sec')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle()
  if (eErr || !enrollment) return { data: null, error: eErr }

  const [{ data: nodes }, { data: progress }] = await Promise.all([
    supabase.from('nodes').select('id, type').eq('course_id', courseId).eq('status', 'published'),
    supabase.from('progress').select('state, score, node_id').eq('enrollment_id', enrollment.id),
  ])
  const totalNodes = (nodes || []).length
  const completed = (progress || []).filter(p => p.state === 'completed').length
  const quizNodes = (nodes || []).filter(n => n.type === 'quiz' || n.type === 'boss')
  const quizProgress = (progress || []).filter(p => {
    const node = (nodes || []).find(n => n.id === p.node_id)
    return node && (node.type === 'quiz' || node.type === 'boss') && p.state === 'completed' && p.score != null
  })
  const scores = quizProgress.map(p => Number(p.score))
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const totalCorrect = scores.filter(s => s >= 60).length
  const totalWrong = scores.filter(s => s < 60).length
  return {
    data: {
      completedNodes: completed,
      totalNodes,
      avgScore,
      totalCorrect,
      totalWrong,
      aiInteractions: enrollment.ai_interactions || 0,
      studyTimeMin: Math.round((enrollment.study_time_sec || 0) / 60),
    },
    error: null,
  }
}

export async function listNotifications(userId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, payload, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  return { data: data || [], error }
}

export async function markNotificationRead(notifId) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notifId)
  return { data, error }
}

export async function listLinkedStudentsForParent(parentId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('parent_links')
    .select('id, student_id, status, created_at, student:profiles!parent_links_student_id_fkey(id, full_name, avatar_id, pet_type, pet_name, pet_xp, email)')
    .eq('parent_id', parentId)
    .eq('status', 'accepted')
  return { data: data || [], error }
}

export async function requestParentLink({ parentId, studentEmail, studentId: directStudentId }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  let student = null
  if (directStudentId) {
    const { data: s, error: sErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('id', directStudentId)
      .eq('role', 'student')
      .single()
    if (sErr || !s) return { data: null, error: new Error('No se encontró un estudiante con ese DNI.') }
    student = s
  } else if (studentEmail) {
    const { data: s, error: sErr } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('email', studentEmail)
      .eq('role', 'student')
      .single()
    if (sErr || !s) return { data: null, error: new Error('No se encontró un estudiante con ese correo.') }
    student = s
  } else {
    return { data: null, error: new Error('Debe proporcionar DNI del estudiante.') }
  }

  // One parent per student rule
  const { data: existingAccepted } = await supabase
    .from('parent_links')
    .select('id')
    .eq('student_id', student.id)
    .eq('status', 'accepted')
    .maybeSingle()
  if (existingAccepted) {
    return { data: null, error: new Error('Este estudiante ya está vinculado a otro padre. Solo un padre por estudiante.') }
  }

  // Direct accept: upsert with status accepted (no notification/approval needed)
  const { data, error } = await supabase
    .from('parent_links')
    .upsert({ parent_id: parentId, student_id: student.id, status: 'accepted' }, { onConflict: 'parent_id,student_id' })
    .select()
    .single()

  return { data, error }
}

export async function unlinkStudent(linkId) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase.from('parent_links').delete().eq('id', linkId)
  return { data, error }
}

export async function recordWeakness({ studentId, courseId, concept, isError = true }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  // Tabla `weaknesses` (no RPC): insert simple
  const { data, error } = await supabase.from('weaknesses').insert({
    student_id: studentId,
    course_id: courseId || null,
    concept,
    is_error: isError,
  })
  return { data, error }
}

export async function getStoragePath(courseId, filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${courseId}/${Date.now()}_${safe}`
}

export async function getCourseNodesAllStatus(courseId) {
  if (!isSupabaseConfigured) return FALLBACK([])
  const { data, error } = await supabase
    .from('nodes')
    .select('id, course_id, position, type, title, description, content, status')
    .eq('course_id', courseId)
    .order('position', { ascending: true })
  return { data: data || [], error }
}

export async function batchUpdateNodes(updates) {
  if (!isSupabaseConfigured || !updates.length) return FALLBACK([])
  const results = []
  for (const { id, ...changes } of updates) {
    const { data, error } = await supabase.from('nodes').update(changes).eq('id', id).select().single()
    if (error) console.warn('batchUpdateNodes error for', id, error)
    if (data) results.push(data)
  }
  return { data: results, error: null }
}

export async function deleteCourseNode(nodeId) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data, error } = await supabase.from('nodes').delete().eq('id', nodeId)
  return { data, error }
}

export async function removeStudentFromCourse({ courseId, studentId }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!enrollment) return { data: null, error: new Error('Estudiante no encontrado en este curso') }
  await supabase.from('progress').delete().eq('enrollment_id', enrollment.id)
  const { data, error } = await supabase.from('enrollments').delete().eq('id', enrollment.id).select().single()
  return { data, error }
}

export async function approveAllNodes(courseId, updatedNodes = []) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  // Delete all existing nodes and re-insert with final state
  await supabase.from('nodes').delete().eq('course_id', courseId)
  const rows = updatedNodes.map((n, i) => ({
    course_id: courseId,
    title: String(n.title || 'Nodo').slice(0, 120),
    type: ['theory','practice','quiz','boss','reward'].includes(n.type) ? n.type : 'theory',
    description: String(n.description || '').slice(0, 300),
    content: n.content || '',
    position: i + 1,
    status: 'published',
  }))
  const { error: insErr } = await supabase.from('nodes').insert(rows)
  if (insErr) return { data: null, error: insErr }
  await supabase.from('courses').update({ status: 'published' }).eq('id', courseId)
  return { data: rows, error: null }
}

export async function uploadSourceFile({ courseId, file }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  await requireSession()
  // Convert file to base64
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const content = btoa(binary)

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-source`
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ courseId, filename: file.name, content }),
  })
  if (!res.ok) {
    const text = await res.text()
    return { data: null, error: new Error(text || 'Upload failed') }
  }
  const data = await res.json()
  return { data, error: null }
}

export async function pollSourceFileStatus(sourceId, { timeoutMs = 120000, intervalMs = 2000 } = {}) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await supabase.from('source_files').select('status, chunks_count').eq('id', sourceId).single()
    if (error) return { data: null, error }
    if (data.status === 'ready' || data.status === 'error') return { data, error: null }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return { data: null, error: new Error('Timeout esperando el procesamiento del archivo') }
}

function detectFileType(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'docx'
  if (['txt', 'md'].includes(ext)) return 'txt'
  return 'txt'
}

export { g, isSupabaseConfigured }
