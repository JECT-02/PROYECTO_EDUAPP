import { useState } from 'react'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Clock, Link2, Unlink, X, CheckCircle, AlertCircle, Search, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import './ParentDashboard.css'

// Per-student mock chart data
const STUDENT_CHART_DATA = {
  default: [
    { name: 'Lun', mins: 45 }, { name: 'Mar', mins: 60 }, { name: 'Mié', mins: 30 },
    { name: 'Jue', mins: 80 }, { name: 'Vie', mins: 40 }, { name: 'Sáb', mins: 120 }, { name: 'Dom', mins: 0 },
  ],
}

function getChartData(studentId) {
  // Generate deterministic-ish data based on DNI for variety
  if (STUDENT_CHART_DATA[studentId]) return STUDENT_CHART_DATA[studentId]
  const num = parseInt(studentId.toString().slice(-4), 10) || 500
  const data = [
    { name: 'Lun', mins: 20 + (num % 60) },
    { name: 'Mar', mins: 15 + (num * 2 % 70) },
    { name: 'Mié', mins: 10 + (num * 3 % 50) },
    { name: 'Jue', mins: 25 + (num * 4 % 80) },
    { name: 'Vie', mins: 30 + (num * 5 % 45) },
    { name: 'Sáb', mins: 40 + (num * 6 % 100) },
    { name: 'Dom', mins: 5 + (num * 7 % 30) },
  ]
  STUDENT_CHART_DATA[studentId] = data
  return data
}

function getStudentStats(studentId) {
  const num = parseInt(studentId.toString().slice(-4), 10) || 500
  return {
    understanding: 50 + (num % 45),
    lessons: 10 + (num % 50),
    progress: 30 + (num % 65),
    lastActive: num % 3 === 0 ? 'Hoy' : num % 3 === 1 ? 'Ayer' : 'Hace 3 días',
    activeColor: num % 3 === 0 ? '#22C55E' : num % 3 === 1 ? '#F59E0B' : '#EF4444',
  }
}

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
  const [studentEmail, setStudentEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const linkedStudents = contextLinked || []

  async function handleLink(e) {
    e.preventDefault()
    if (!studentEmail.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await linkStudent(studentEmail.trim().toLowerCase())
      setResult(res)
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
    setResult(null)
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

          {/* Linked students with per-student charts */}
          {linkedStudents.length > 0 ? (
            <div className="parent-students-grid">
              {linkedStudents.map((s, idx) => {
                const stats = getStudentStats(s.id)
                const chartData = getChartData(s.id)
                const avgMins = Math.round(chartData.reduce((sum, d) => sum + d.mins, 0) / chartData.length)

                return (
                  <motion.div
                    key={s.id}
                    className="parent-student-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {/* Header */}
                    <div className="parent-student-top">
                      <div className="parent-student-info">
                        <div className="parent-student-avatar">🦊</div>
                        <div>
                          <div className="parent-student-name">{s.name}</div>
                          <div className="parent-student-id">ID: {s.id?.slice(0, 8) || '—'}</div>
                        </div>
                      </div>
                      <button
                        className="btn-unlink"
                        onClick={() => handleUnlink(s.linkId || s.id)}
                      >
                        <Unlink size={14} />
                        Desvincular
                      </button>
                    </div>

                    {/* Content: stats + chart side by side */}
                    <div className="parent-student-content">
                      {/* Stats column */}
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
                          <span className="parent-stat-value" style={{ color: stats.activeColor }}>
                            {stats.lastActive}
                          </span>
                          <span className="parent-stat-label">Última vez</span>
                        </div>
                      </div>

                      {/* Chart column */}
                      <div className="parent-student-chart-col">
                        <div className="parent-chart-header">
                          <Clock size={12} />
                          <span>Semanal: {avgMins} min/día</span>
                        </div>
                        <div className="parent-student-chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <XAxis dataKey="name" stroke="#6B6D8A" fontSize={9} tickLine={false} axisLine={false} interval={0} />
                              <Tooltip content={<ChartTooltip />} />
                              <Line type="monotone" dataKey="mins" stroke="#6C63FF" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#6C63FF' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
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
              <p>Vincula a tu hijo ingresando su DNI de estudiante para seguir su progreso.</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Link2 size={16} />
                Vincular ahora
              </button>
            </motion.div>
          )}

          {/* Link student modal */}
          <AnimatePresence>
            {showModal && (
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal() }}
              >
                <motion.div
                  className="modal-container"
                  style={{ maxWidth: 460 }}
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 20 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>Vincular estudiante</h2>
                    <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Cerrar">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="modal-body" style={{ padding: '24px 28px' }}>
                    {!result ? (
                      <form onSubmit={handleLink}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                          Ingresa el correo del estudiante. Él recibirá una solicitud de vínculo que deberá aceptar.
                        </p>
                        <div className="input-group">
                          <label htmlFor="student-email">Correo del estudiante</label>
                          <div className="input-icon-wrap">
                            <Mail size={16} className="input-icon" />
                            <input
                              id="student-email"
                              type="email"
                              className="input-field with-icon"
                              placeholder="estudiante@email.com"
                              value={studentEmail}
                              onChange={e => setStudentEmail(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary full-w"
                          disabled={!studentEmail.trim() || loading}
                          style={{ marginTop: 8 }}
                        >
                          {loading ? <span className="spinner" /> : <><Link2 size={16} /> Enviar solicitud</>}
                        </button>
                      </form>
                    ) : result.success ? (
                      <div className="parent-link-result success">
                        <div className="parent-link-icon">
                          <CheckCircle size={40} />
                        </div>
                        <h3>¡Solicitud enviada!</h3>
                        <p>
                          Se envió la solicitud a <strong>{result.student?.name || studentEmail}</strong>. Cuando la acepte, aparecerá en tu panel.
                        </p>
                        <button className="btn btn-primary" onClick={handleCloseModal}>
                          Entendido
                        </button>
                      </div>
                    ) : (
                      <div className="parent-link-result error">
                        <div className="parent-link-icon error">
                          <AlertCircle size={40} />
                        </div>
                        <h3>No se pudo vincular</h3>
                        <p>{result.error}</p>
                        <button className="btn btn-ghost" onClick={() => { setResult(null); setStudentEmail('') }}>
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
