import { supabase, isSupabaseConfigured } from './supabase'

export async function createNotification(userId, type, payload = {}) {
  if (!isSupabaseConfigured || !userId) return null
  const { data, error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    payload,
  }).select().single()
  if (error) {
    console.warn('[notifications] create error:', error.message)
    return null
  }
  return data
}

export async function markAsRead(notifId) {
  if (!isSupabaseConfigured) return null
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notifId)
  if (error) console.warn('[notifications] markAsRead error:', error.message)
  return !error
}

export async function markAllAsRead(userId) {
  if (!isSupabaseConfigured || !userId) return null
  const { error } = await supabase.from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) console.warn('[notifications] markAllAsRead error:', error.message)
  return !error
}

export async function notifyAchievement(studentId, medalName, medalRarity) {
  return createNotification(studentId, 'medal', {
    title: `Nuevo logro: ${medalName}`,
    desc: `Has desbloqueado el logro "${medalName}" de rareza ${medalRarity}`,
    medal_name: medalName,
    rarity: medalRarity,
  })
}

export async function notifyNodeCompleted(studentId, nodeTitle, courseTitle) {
  return createNotification(studentId, 'progress', {
    title: 'Nodo completado',
    desc: `Has completado "${nodeTitle}" en ${courseTitle}`,
    node_title: nodeTitle,
    course_title: courseTitle,
  })
}

export async function notifyQuizCompleted(studentId, score, total, nodeTitle, courseTitle) {
  const passed = total > 0 ? ((score / total) * 100) >= 60 : false
  return createNotification(studentId, 'quiz_result', {
    title: passed ? 'Quiz aprobado' : 'Quiz requiere repaso',
    desc: `${score}/${total} en "${nodeTitle}" — ${courseTitle}`,
    score,
    total,
    node_title: nodeTitle,
    course_title: courseTitle,
  })
}

export async function notifyCourseEnrolled(studentId, courseTitle, teacherName) {
  return createNotification(studentId, 'enrollment', {
    title: 'Nuevo curso asignado',
    desc: `${courseTitle}${teacherName ? ` por ${teacherName}` : ''} ya está disponible`,
    course_title: courseTitle,
  })
}

export async function notifyTeacherNewStudent(teacherId, studentName, courseTitle) {
  return createNotification(teacherId, 'new_student', {
    title: 'Nuevo estudiante inscrito',
    desc: `${studentName} se unió a "${courseTitle}"`,
    student_name: studentName,
    course_title: courseTitle,
  })
}

export async function notifyTeacherProgress(teacherId, studentName, courseTitle, percentage) {
  return createNotification(teacherId, 'student_progress', {
    title: percentage >= 80 ? 'Progreso destacado' : 'Estudiante avanzando',
    desc: `${studentName} completó el ${percentage}% de "${courseTitle}"`,
    student_name: studentName,
    course_title: courseTitle,
    progress: percentage,
  })
}

export async function notifyTeacherInactivity(teacherId, studentName, courseTitle, daysInactive) {
  return createNotification(teacherId, 'inactivity_alert', {
    title: 'Estudiante sin actividad',
    desc: `${studentName} — ${courseTitle}: ${daysInactive}+ días sin acceder`,
    student_name: studentName,
    course_title: courseTitle,
    days_inactive: daysInactive,
  })
}

export async function notifyParentProgress(parentId, studentName, courseTitle, nodeTitle) {
  return createNotification(parentId, 'child_progress', {
    title: 'Progreso de tu hijo',
    desc: `${studentName} completó "${nodeTitle}" en ${courseTitle}`,
    student_name: studentName,
    course_title: courseTitle,
    node_title: nodeTitle,
  })
}

export async function notifyParentMedal(parentId, studentName, medalName) {
  return createNotification(parentId, 'child_medal', {
    title: 'Nueva medalla',
    desc: `${studentName} ganó "${medalName}"`,
    student_name: studentName,
    medal_name: medalName,
  })
}

export async function notifyColiseoResult(studentId, passed, score, courseTitle) {
  return createNotification(studentId, 'coliseo_result', {
    title: passed ? 'Coliseo superado' : 'Coliseo — necesita práctica',
    desc: `${score}% en el Coliseo de ${courseTitle}`,
    score,
    course_title: courseTitle,
  })
}
