import { useState } from 'react'
import {
  Plus, Book, Users, TrendingUp, Clock,
  Edit, Check, X,
  GraduationCap, FileText, Eye, AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import CourseCreateModal from '../components/CourseCreateModal'
import CourseDetailModal from '../components/CourseDetailModal'
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

export default function TeacherDashboard() {
  const [courses, setCourses] = useState(INITIAL_COURSES)
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState({ title: '', desc: '', type: 'success' })
  const [detailCourse, setDetailCourse] = useState(null)

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

  const handleDeleteCourse = (courseId) => {
    const deleted = courses.find(c => c.id === courseId)
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
                  </div>

                  {/* Ver detalles button */}
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                    onClick={(e) => { e.stopPropagation(); setDetailCourse(course) }}
                  >
                    <Eye size={14} />
                    Ver detalles
                  </button>
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
