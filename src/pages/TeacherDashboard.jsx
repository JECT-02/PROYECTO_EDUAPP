import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Book, Users, TrendingUp, Clock,
  Edit, Check, X, Map,
  GraduationCap, FileText, Eye, AlertCircle, Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import CourseCreateModal from '../components/CourseCreateModal'
import CourseDetailModal from '../components/CourseDetailModal'
import { useAuth } from '../context/AuthContext'
import { getTeacherCourses, deleteCourse as apiDeleteCourse, isSupabaseConfigured } from '../lib/api'
import './TeacherDashboard.css'

const STATUS_MAP = {
  draft: { label: 'Borrador', cls: 'badge-gray' },
  published: { label: 'Activo', cls: 'badge-green' },
  archived: { label: 'Archivado', cls: 'badge-purple' },
}

const COLOR_POOL = ['#22C55E', '#6C63FF', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#8B5CF6']

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState({ title: '', desc: '', type: 'success' })
  const [detailCourse, setDetailCourse] = useState(null)

  async function load() {
    if (!user?.id) return
    setLoading(true)
    const { data } = await getTeacherCourses(user.id)
    const mapped = (data || []).map((c, i) => ({
      id: c.id,
      name: c.title,
      subject: c.category || '—',
      description: c.description || '',
      students: (c.enrollments || []).length,
      nodes: (c.nodes || []).length,
      progress: 0,
      status: STATUS_MAP[c.status]?.label || c.status,
      color: COLOR_POOL[i % COLOR_POOL.length],
      level: c.level || 'Todos',
      createdAt: c.created_at?.slice(0, 10) || '',
      inviteCode: c.invite_code || c.invite_token || '',
    }))
    setCourses(mapped)
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id])

  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0)
  const activeCourses = courses.filter(c => c.status === 'Activo').length
  const avgProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
    : 0

  const handleCourseCreated = async (newCourse) => {
    await load()
    // Si el modal devolvió un inviteCode pero el load todavía no lo recogió, lo inyectamos
    setCourses((prev) => prev.map((c) => c.id === newCourse.id ? { ...c, inviteCode: newCourse.inviteCode || c.inviteCode } : c))
    setToastMsg({
      title: 'Curso creado exitosamente',
      desc: `"${newCourse.name}" ha sido agregado a tus cursos.${newCourse.inviteCode ? ' Código: ' + newCourse.inviteCode : ''}`,
      type: 'success',
    })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const handleDeleteCourse = async (courseId) => {
    const deleted = courses.find(c => c.id === courseId)
    if (isSupabaseConfigured) {
      await apiDeleteCourse(courseId)
    }
    setCourses(prev => prev.filter(c => c.id !== courseId))
    setDetailCourse(null)
    setToastMsg({
      title: 'Curso eliminado',
      desc: `"${deleted?.name}" ha sido eliminado permanentemente.`,
      type: 'error',
    })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const statusBadge = (status) => {
    const entry = Object.values(STATUS_MAP).find((v) => v.label === status) || STATUS_MAP.draft
    return <span className={`badge ${entry.cls}`}>{entry.label}</span>
  }

  return (
    <PageWrapper>
      <Header />

      <div className="teacher-layout">
        {/* Header */}
        <div className="teacher-header">
          <div>
            <h1>Panel Docente</h1>
            <p>Gestiona tus cursos, revisa el progreso de tus estudiantes y crea nuevo contenido.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Crear nuevo curso
          </button>
        </div>

        {/* Stats */}
        <motion.div
          className="stats-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(108,99,255,0.12)', color: '#8B83FF' }}>
              <GraduationCap size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{courses.length}</div>
              <div className="stat-label">Total cursos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80' }}>
              <Users size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalStudents}</div>
              <div className="stat-label">Estudiantes activos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D' }}>
              <Book size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{activeCourses}</div>
              <div className="stat-label">Cursos activos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA' }}>
              <TrendingUp size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{avgProgress}%</div>
              <div className="stat-label">Progreso promedio</div>
            </div>
          </div>
        </motion.div>



        {/* Courses */}
        <div>
          <div className="teacher-section-header">
            <h2>Tus cursos ({courses.length})</h2>
            <Link to="/teacher/review" className="btn btn-ghost btn-sm">
              <Sparkles size={14} /> Revisar contenido IA
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">📚</div>
              <h3>No tienes cursos aún</h3>
              <p>Crea tu primer curso usando el botón "Crear nuevo curso". La IA te ayudará a generar el contenido automáticamente.</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Crear primer curso
              </button>
            </div>
          ) : (
            <div className="teacher-courses-grid">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  className="teacher-course-card"
                  style={{ '--course-color': course.color }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setDetailCourse(course)}
                >
                  <div className="teacher-course-top">
                    <div
                      className="teacher-course-icon"
                      style={{ background: `${course.color}18`, color: course.color }}
                    >
                      {course.name.charAt(0)}
                    </div>
                    <div className="teacher-course-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 8px', minWidth: 0 }}
                        onClick={(e) => { e.stopPropagation(); /* edit */ }}
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {statusBadge(course.status)}
                  </div>

                  <div className="teacher-course-title">{course.name}</div>
                  <div className="teacher-course-desc">{course.description}</div>

                  <div className="teacher-course-meta">
                    <div className="teacher-course-meta-item">
                      <Users size={14} />
                      {course.students} estudiantes
                    </div>
                    <div className="teacher-course-meta-item">
                      <FileText size={14} />
                      {course.nodes} nodos
                    </div>
                    <div className="teacher-course-meta-item">
                      <Clock size={14} />
                      {course.createdAt}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/roadmap/${course.id}`) }}
                    >
                      <Map size={14} />
                      Roadmap
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); setDetailCourse(course) }}
                    >
                      <Eye size={14} />
                      Detalles
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>


      </div>

      {/* Toast */}
      {showToast && (
        <motion.div
          className={`teacher-toast ${toastMsg.type}`}
          initial={{ opacity: 0, y: 40, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="teacher-toast-icon">
            {toastMsg.type === 'success' ? <Check size={20} style={{ color: '#4ADE80' }} /> : <AlertCircle size={20} style={{ color: '#FCA5A5' }} />}
          </div>
          <div className="teacher-toast-content">
            <div className="teacher-toast-title">{toastMsg.title}</div>
            <div className="teacher-toast-desc">{toastMsg.desc}</div>
          </div>
          <button className="teacher-toast-close" onClick={() => setShowToast(false)}>
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Create modal */}
      <CourseCreateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCourseCreated}
      />

      {/* Course detail modal */}
      <CourseDetailModal
        isOpen={!!detailCourse}
        onClose={() => setDetailCourse(null)}
        course={detailCourse}
        onDelete={handleDeleteCourse}
      />
    </PageWrapper>
  )
}
