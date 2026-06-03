import { supabase, isSupabaseConfigured, requireSession } from './supabase'

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
  return { data, error }
}

/**
 * Buscar un perfil de estudiante por email o DNI.
 * Devuelve hasta 5 resultados.
 */
export async function searchStudents(query) {
  if (!isSupabaseConfigured || !query?.trim()) return FALLBACK([])
  const q = query.trim()
  // Coincidir con email o dni
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, dni, role, avatar_id, pet_name, pet_type')
    .or(`email.ilike.%${q}%,dni.ilike.%${q}%,full_name.ilike.%${q}%`)
    .eq('role', 'student')
    .limit(5)
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
    .select('id, medal_type, name, rarity, svg_url, unlocked_at')
    .eq('student_id', studentId)
    .order('unlocked_at', { ascending: false })
  return { data: data || [], error }
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

export async function requestParentLink({ parentId, studentEmail }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  const { data: student, error: sErr } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('email', studentEmail)
    .eq('role', 'student')
    .single()
  if (sErr || !student) return { data: null, error: new Error('No se encontró un estudiante con ese correo. Verifica e intenta de nuevo.') }
  const { data, error } = await supabase
    .from('parent_links')
    .insert({ parent_id: parentId, student_id: student.id, status: 'pending' })
    .select()
    .single()
  await supabase.from('notifications').insert({
    user_id: student.id,
    type: 'parent_request',
    payload: { parent_id: parentId },
  })
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
  return `${courseId}/${Date.now()}_${filename}`
}

export async function uploadSourceFile({ courseId, file }) {
  if (!isSupabaseConfigured) return FALLBACK(null)
  await requireSession()
  const path = await getStoragePath(courseId, file.name)
  const { error } = await supabase.storage.from('course-source').upload(path, file, { upsert: false })
  if (error) return { data: null, error }
  const { data: sourceRow, error: sErr } = await supabase
    .from('source_files')
    .insert({
      course_id: courseId,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      filename: file.name,
      storage_path: path,
      file_type: detectFileType(file.name),
      status: 'pending',
    })
    .select()
    .single()
  return { data: sourceRow, error: sErr || error }
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
