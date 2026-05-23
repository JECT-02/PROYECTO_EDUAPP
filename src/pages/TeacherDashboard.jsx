import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Book, Users, TrendingUp, Clock, AlertTriangle,
  Edit, Trash2, BarChart3, LogOut, Check, X,
  GraduationCap, FileText, Star
} from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import CourseCreateModal from '../components/CourseCreateModal'
import './TeacherDashboard.css'

const INITIAL_COURSES = [
  {
    id: 1,
    name: 'Biologia Celular',
    subject: 'Biologia',
    description: 'Estudio de la estructura y funcion de las celulas, organelos y procesos metabolicos fundamentales.',
    students: 45,
    nodes: 12,
    progress: 72,
    status: 'Activo',
    color: '#22C55E',
    level: 'Intermedio',
    createdAt: '2025-01-15',
  },
  {
    id: 2,
    name: 'Anatomia Basica',
    subject: 'Anatomia',
    description: 'Introduccion a la anatomia humana: sistemas, organos y sus funciones principales.',
    students: 32,
    nodes: 10,
    progress: 45,
    status: 'Activo',
    color: '#6C63FF',
    level: 'Principiante',
    createdAt: '2025-02-20',
  },
  {
    id: 3,
    name: 'Bioquimica General',
    subject: 'Quimica',
    description: 'Principios de bioquimica: moleculas biologicas, enzimas y rutas metabolicas.',
    students: 18,
    nodes: 8,
    progress: 15,
    status: 'Borrador',
    color: '#F59E0B',
    level: 'Avanzado',
    createdAt: '2025-03-10',
  },
]

const ALERTS = [
  { id: 1, student: 'Juan P.', issue: 'Dificultad persistente en "Mitocondria"', detail: '3 errores consecutivos', severity: 'warning' },
  { id: 2, student: 'Maria G.', issue: 'Inactividad prolongada', detail: '5 dias sin actividad', severity: 'error' },
  { id: 3, student: 'Carlos R.', issue: 'Rendimiento destacado', detail: '90% de aciertos en examenes', severity: 'success' },
]

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState(INITIAL_COURSES)
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState({ title: '', desc: '', type: 'success' })

  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0)
  const activeCourses = courses.filter(c => c.status === 'Activo').length
  const avgProgress = Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)

  const handleCourseCreated = (newCourse) => {
    setCourses(prev => [newCourse, ...prev])
    setToastMsg({
      title: 'Curso creado exitosamente',
      desc: `"${newCourse.name}" ha sido agregado a tus cursos.`,
      type: 'success',
    })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const deleteCourse = (id, e) => {
    e.stopPropagation()
    const course = courses.find(c => c.id === id)
    if (!window.confirm(`¿Estas seguro de eliminar "${course?.name}"? Esta accion no se puede deshacer.`)) return
    setCourses(prev => prev.filter(c => c.id !== id))
    setToastMsg({
      title: 'Curso eliminado',
      desc: `"${course?.name}" ha sido eliminado.`,
      type: 'error',
    })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const statusBadge = (status) => {
    const map = {
      'Activo': { cls: 'badge-green', label: status },
      'Borrador': { cls: 'badge-gray', label: status },
      'Completado': { cls: 'badge-purple', label: status },
    }
    const s = map[status] || { cls: 'badge-gray', label: status }
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  return (
    <PageWrapper>
      <Header user={{ name: 'Prof. Ana Torres', avatar: '👩‍🏫' }} />

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
          <div className="stat-card card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(108,99,255,0.12)', color: '#8B83FF' }}>
              <GraduationCap size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{courses.length}</div>
              <div className="stat-label">Total cursos</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80' }}>
              <Users size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalStudents}</div>
              <div className="stat-label">Estudiantes activos</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D' }}>
              <Book size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{activeCourses}</div>
              <div className="stat-label">Cursos activos</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA' }}>
              <TrendingUp size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{avgProgress}%</div>
              <div className="stat-label">Progreso promedio</div>
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div
          className="card"
          style={{ padding: 20, borderColor: 'rgba(249,115,22,0.3)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            Alertas y novedades
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ALERTS.map(a => {
              const severityColors = {
                warning: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', dot: '#F97316' },
                error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', dot: '#EF4444' },
                success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', dot: '#22C55E' },
              }
              const s = severityColors[a.severity]
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 'var(--radius)',
                    background: s.bg, border: `1px solid ${s.border}`,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.88rem' }}>{a.student}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 6 }}>{a.issue}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{a.detail}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Courses */}
        <div>
          <div className="teacher-section-header">
            <h2>Tus cursos ({courses.length})</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Nuevo curso
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">📚</div>
              <h3>No tienes cursos aun</h3>
              <p>Crea tu primer curso usando el boton "Crear nuevo curso". La IA te ayudara a generar el contenido automaticamente.</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Crear primer curso
              </button>
            </div>
          ) : (
            <div className="teacher-courses-grid">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  className="teacher-course-card card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/teacher/course/${course.id}`)}
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
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 8px', minWidth: 0, color: 'var(--error)' }}
                        onClick={(e) => deleteCourse(course.id, e)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {statusBadge(course.status)}
                    <span className="badge badge-blue">{course.level}</span>
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

                  <div className="teacher-course-footer">
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${course.progress}%`,
                            background: `linear-gradient(90deg, ${course.color}, ${course.color}aa)`,
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: course.color }}>
                      {course.progress}%
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: 8, padding: '6px 8px', minWidth: 0 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/teacher/course/${course.id}/analytics`) }}
                    >
                      <BarChart3 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
            <Star size={14} /> Vista estudiante
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
            <LogOut size={14} /> Cerrar sesion (Demo)
          </button>
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
    </PageWrapper>
  )
}
