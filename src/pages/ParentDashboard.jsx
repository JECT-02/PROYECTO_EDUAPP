import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Clock, Link2, Unlink, X, CheckCircle, AlertCircle, LoaderCircle, Mail, IdCard, ChevronDown, ChevronUp, BookOpen, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import { getStudentEnrollments, getCourseNodes, getProgressForEnrollment, getUnderstandingData, isSupabaseConfigured, listStudentMedals, searchStudents } from '../lib/api'
import { calculateUnderstanding, understandingColor } from '../lib/understanding'
import './ParentDashboard.css'

function ChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1A1935', border: 'none', borderRadius: 8,
        color: '#fff', padding: '6px 10px', fontSize: '0.75rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        {payload[0].value} min
      </div>
    )
  }
  return null
}

export default function ParentDashboard() {
  const { user, linkStudent, unlinkStudent, linkedStudents: contextLinked } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [linkMode, setLinkMode] = useState('email')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentDNI, setStudentDNI] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [studentsData, setStudentsData] = useState({})
  const [loadingStats, setLoadingStats] = useState(false)
  const [expandedStudent, setExpandedStudent] = useState(null)

  const linkedStudents = contextLinked || []

  useEffect(() => {
    if (!linkedStudents.length || !isSupabaseConfigured) return
    let cancelled = false
    async function loadStats() {
      setLoadingStats(true)
      const data = {}
      for (const s of linkedStudents) {
        try {
          const [enrResult, medalsResult] = await Promise.all([
            getStudentEnrollments(s.id),
            listStudentMedals(s.id),
          ])
          if (cancelled) return
          const enrollments = enrResult?.data || []
          const medals = medalsResult?.data || []

          let totalLessons = 0
          let totalProgress = 0
          let lastActive = null
          let globalUnderstanding = null
          const courses = []

          for (const e of enrollments) {
            const [nodesResult, progResult] = await Promise.all([
              getCourseNodes(e.course_id),
              getProgressForEnrollment(e.id),
            ])
            if (cancelled) return
            const nodes = nodesResult?.data || []
            const prog = progResult?.data || []
            const completed = prog.filter(p => p.state === 'completed').length
            const courseProgress = nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0
            totalLessons += completed
            totalProgress = enrollments.length > 0 ? courseProgress : totalProgress

            const completedDates = prog.filter(p => p.completed_at).map(p => new Date(p.completed_at))
            if (completedDates.length > 0) {
              const latest = new Date(Math.max(...completedDates))
              if (!lastActive || latest > lastActive) lastActive = latest
            }

            const { data: ud } = await getUnderstandingData(s.id, e.course_id)
            const courseUnderstanding = ud ? calculateUnderstanding(ud) : null

            if (!globalUnderstanding && courseUnderstanding) {
              globalUnderstanding = courseUnderstanding
            }

            courses.push({
              courseId: e.course_id,
              courseTitle: e.courses?.title || 'Curso',
              progress: courseProgress,
              completed,
              total: nodes.length,
              understanding: courseUnderstanding?.value || 0,
              understandingColor: courseUnderstanding ? understandingColor(courseUnderstanding.value) : 'var(--text-dim)',
            })
          }
          if (cancelled) return

          data[s.id] = {
            lessons: totalLessons,
            progress: totalProgress,
            understanding: globalUnderstanding?.value || 0,
            lastActive,
            medals: medals.length,
            courses,
            chartData: generatePlaceholderChart(s.id),
          }
        } catch {
          data[s.id] = { lessons: 0, progress: 0, understanding: 0, lastActive: null, medals: 0, courses: [], chartData: [] }
        }
      }
      if (cancelled) return
      setStudentsData(data)
      setLoadingStats(false)
    }
    loadStats()
    return () => { cancelled = true }
  }, [linkedStudents])

  function generatePlaceholderChart(studentId) {
    const num = parseInt(String(studentId).slice(-4), 10) || 500
    return [
      { name: 'Lun', mins: 20 + (num % 60) },
      { name: 'Mar', mins: 15 + (num * 2 % 70) },
      { name: 'Mié', mins: 10 + (num * 3 % 50) },
      { name: 'Jue', mins: 25 + (num * 4 % 80) },
      { name: 'Vie', mins: 30 + (num * 5 % 45) },
      { name: 'Sáb', mins: 40 + (num * 6 % 100) },
      { name: 'Dom', mins: 5 + (num * 7 % 30) },
    ]
  }

  function formatLastActive(date) {
    if (!date) return { label: '—', color: 'var(--text-dim)' }
    const diff = Date.now() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return { label: 'Hoy', color: '#22C55E' }
    if (days === 1) return { label: 'Ayer', color: '#F59E0B' }
    return { label: `Hace ${days}d`, color: days > 5 ? '#EF4444' : '#F59E0B' }
  }

  async function handleLink(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      if (linkMode === 'dni') {
        if (!studentDNI.trim()) return
        const { data: students } = await searchStudents(studentDNI.trim())
        if (!students || students.length === 0) {
          setResult({ success: false, error: 'No se encontró un estudiante con ese DNI.' })
          return
        }
        const found = students[0]
        const res = await linkStudent(found.email)
        setResult(res)
      } else {
        if (!studentEmail.trim()) return
        const res = await linkStudent(studentEmail.trim().toLowerCase())
        setResult(res)
      }
    } catch (err) {
      setResult({ success: false, error: err.message || 'Error inesperado' })
    } finally {
      setLoading(false)
    }
  }

  function handleUnlink(studentOrLinkId) {
    unlinkStudent(studentOrLinkId)
  }

  function handleCloseModal() {
    setShowModal(false)
    setStudentEmail('')
    setStudentDNI('')
    setResult(null)
    setLinkMode('email')
  }

  return (
    <PageWrapper>
      <Header />
      <div className="parent-dashboard">
        <div className="parent-dashboard-inner">
          <div className="parent-header">
            <div>
              <h1 className="parent-title">Panel Familiar</h1>
              <p className="parent-subtitle">
                {linkedStudents.length > 0
                  ? `${linkedStudents.length} estudiante${linkedStudents.length !== 1 ? 's' : ''} vinculado${linkedStudents.length !== 1 ? 's' : ''}`
                  : 'Aún no has vinculado estudiantes'}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Link2 size={16} />
              Vincular estudiante
            </button>
          </div>

          {linkedStudents.length > 0 ? (
            <div className="parent-students-grid">
              {linkedStudents.map((s, idx) => {
                const stats = studentsData[s.id] || { lessons: 0, progress: 0, understanding: 0, lastActive: null, medals: 0, courses: [], chartData: [] }
                const lastActiveInfo = formatLastActive(stats.lastActive)
                const avgMins = stats.chartData.length > 0
                  ? Math.round(stats.chartData.reduce((sum, d) => sum + d.mins, 0) / stats.chartData.length)
                  : 0
                const isExpanded = expandedStudent === s.id

                return (
                  <motion.div
                    key={s.id}
                    className="parent-student-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="parent-student-top">
                      <div className="parent-student-info">
                        <div className="parent-student-avatar">🦊</div>
                        <div>
                          <div className="parent-student-name">{s.name}</div>
                          <div className="parent-student-id">ID: {s.id?.slice(0, 8) || '—'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setExpandedStudent(isExpanded ? null : s.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? 'Ocultar' : 'Cursos'}
                        </button>
                        <button className="btn-unlink" onClick={() => handleUnlink(s.linkId || s.id)}>
                          <Unlink size={14} />
                          Desvincular
                        </button>
                      </div>
                    </div>

                    <div className="parent-student-content">
                      <div className="parent-student-stats-col">
                        <div className="parent-stat">
                          <span className="parent-stat-value">{stats.understanding}%</span>
                          <span className="parent-stat-label">Entendimiento</span>
                        </div>
                        <div className="parent-stat">
                          <span className="parent-stat-value">{stats.lessons}</span>
                          <span className="parent-stat-label">Lecciones</span>
                        </div>
                        <div className="parent-stat">
                          <span className="parent-stat-value" style={{ color: lastActiveInfo.color }}>
                            {lastActiveInfo.label}
                          </span>
                          <span className="parent-stat-label">Última vez</span>
                        </div>
                      </div>

                      <div className="parent-student-chart-col">
                        <div className="parent-chart-header">
                          <Clock size={12} />
                          <span>Semanal: {avgMins} min/día</span>
                        </div>
                        <div className="parent-student-chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.chartData}>
                              <XAxis dataKey="name" stroke="#6B6D8A" fontSize={9} tickLine={false} axisLine={false} interval={0} />
                              <Tooltip content={<ChartTooltip />} />
                              <Line type="monotone" dataKey="mins" stroke="#6C63FF" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#6C63FF' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="parent-student-progress">
                      <div className="parent-progress-header">
                        <span>Progreso general</span>
                        <span>{stats.progress}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 5 }}>
                        <div className="progress-fill" style={{
                          width: `${stats.progress}%`,
                          background: `linear-gradient(90deg, #6C63FF, #A78BFA)`,
                        }} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          className="parent-courses-detail"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="parent-courses-divider" />
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
                            <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            Avance por curso
                          </h4>
                          {stats.courses.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Este estudiante aún no está inscrito en cursos.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {stats.courses.map(course => (
                                <div key={course.courseId} className="parent-course-row">
                                  <div className="parent-course-header">
                                    <span className="parent-course-title">{course.courseTitle}</span>
                                    <span className="parent-course-pct" style={{ color: course.understandingColor }}>
                                      {course.understanding}%
                                    </span>
                                  </div>
                                  <div className="progress-bar" style={{ height: 4, marginBottom: 6 }}>
                                    <div className="progress-fill" style={{
                                      width: `${course.progress}%`,
                                      background: `linear-gradient(90deg, ${course.understandingColor}, ${course.understandingColor}aa)`,
                                    }} />
                                  </div>
                                  <div className="parent-course-meta">
                                    <span>{course.completed}/{course.total} lecciones</span>
                                    <span style={{ color: course.understandingColor }}>
                                      <TrendingUp size={12} style={{ verticalAlign: 'middle' }} /> Nivel de entendimiento
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <motion.div
              className="parent-empty-state"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="parent-empty-icon">
                <Users size={40} />
              </div>
              <h3>Aún no hay estudiantes vinculados</h3>
              <p>Vincula a tu hijo ingresando su correo electrónico o DNI de estudiante para seguir su progreso.</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Link2 size={16} />
                Vincular ahora
              </button>
            </motion.div>
          )}

          <AnimatePresence>
            {showModal && (
              <motion.div
                className="parent-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal() }}
              >
                <motion.div
                  className="parent-modal-container"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 20 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="parent-modal-header">
                    <h2>Vincular estudiante</h2>
                    <button className="parent-modal-close-btn" onClick={handleCloseModal} aria-label="Cerrar">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="parent-modal-body">
                    {!result ? (
                      <form onSubmit={handleLink}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                          <button
                            type="button"
                            className={`btn ${linkMode === 'email' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                            onClick={() => { setLinkMode('email'); setStudentDNI('') }}
                          >
                            <Mail size={14} /> Correo
                          </button>
                          <button
                            type="button"
                            className={`btn ${linkMode === 'dni' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                            onClick={() => { setLinkMode('dni'); setStudentEmail('') }}
                          >
                            <IdCard size={14} /> DNI
                          </button>
                        </div>

                        {linkMode === 'email' ? (
                          <div style={{ position: 'relative', marginBottom: 16 }}>
                            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                            <input
                              className="input-field"
                              style={{ paddingLeft: 40 }}
                              type="email"
                              placeholder="Correo del estudiante"
                              value={studentEmail}
                              onChange={e => setStudentEmail(e.target.value)}
                              autoFocus
                              required
                            />
                          </div>
                        ) : (
                          <div style={{ position: 'relative', marginBottom: 16 }}>
                            <IdCard size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                            <input
                              className="input-field"
                              style={{ paddingLeft: 40 }}
                              placeholder="DNI del estudiante"
                              value={studentDNI}
                              onChange={e => setStudentDNI(e.target.value)}
                              autoFocus
                              required
                            />
                          </div>
                        )}

                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                          El estudiante recibirá una notificación para aceptar la vinculación.
                        </p>
                        <button className="btn btn-primary full-w" type="submit" disabled={loading || (!studentEmail.trim() && !studentDNI.trim())}>
                          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <><Link2 size={16} /> Vincular</>}
                        </button>
                      </form>
                    ) : result.success ? (
                      <div className="parent-link-result">
                        <CheckCircle size={48} color="var(--success)" />
                        <h3>Solicitud enviada</h3>
                        <p>El estudiante recibirá una notificación para aceptar la vinculación.</p>
                        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleCloseModal}>
                          Entendido
                        </button>
                      </div>
                    ) : (
                      <div className="parent-link-result">
                        <AlertCircle size={48} color="var(--error)" />
                        <h3>Error</h3>
                        <p>{result.error}</p>
                        <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setResult(null)}>
                          Intentar de nuevo
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  )
}
