import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Clock, Link2, Unlink, X, CheckCircle, AlertCircle, Search, Mail, LoaderCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import { getStudentEnrollments, getProgressForEnrollment, getCourseNodes, getUnderstandingData } from '../lib/api'
import { calculateUnderstanding } from '../lib/understanding'
import './ParentDashboard.css'

function ChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1A1935', border: 'none', borderRadius: 8,
        color: '#fff', padding: '6px 10px', fontSize: '0.75rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        {payload[0].value}%
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
  const [studentsData, setStudentsData] = useState({})
  const [loadingStats, setLoadingStats] = useState(true)

  const linkedStudents = contextLinked || []

  // Load real stats for each linked student
  useEffect(() => {
    if (!linkedStudents.length) { setLoadingStats(false); return }
    let cancelled = false
    async function load() {
      setLoadingStats(true)
      const data = {}
      for (const s of linkedStudents) {
        try {
          const { data: enrollments } = await getStudentEnrollments(s.id)
          let totalCompleted = 0; let totalNodes = 0; let avgScore = null
          let totalCorrect = 0; let totalWrong = 0; let studyTimeMin = 0
          const chartData = []
          for (const e of (enrollments || [])) {
            const { data: ud } = await getUnderstandingData(s.id, e.course_id)
            if (ud) {
              totalCompleted += ud.completedNodes
              totalNodes += ud.totalNodes
              totalCorrect += ud.totalCorrect || 0
              totalWrong += ud.totalWrong || 0
              studyTimeMin += ud.studyTimeMin || 0
              const { data: progress } = await getProgressForEnrollment(e.id)
              const lastCompleted = (progress || []).filter(p => p.completed_at).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0]
              if (lastCompleted?.completed_at) {
                chartData.push({ name: e.courses?.title?.slice(0, 8) || 'Curso', value: ud.avgScore != null ? Math.round(ud.avgScore) : (ud.totalNodes > 0 ? Math.round(ud.completedNodes / ud.totalNodes * 100) : 0) })
              }
            }
          }
          const ud = totalNodes > 0 ? calculateUnderstanding({ completedNodes: totalCompleted, totalNodes, avgScore: totalCorrect + totalWrong > 0 ? Math.round(totalCorrect / (totalCorrect + totalWrong) * 100) : null, totalCorrect, totalWrong, studyTimeMin }) : null
          data[s.id] = {
            understanding: ud?.value || 0,
            completedNodes: totalCompleted,
            totalNodes,
            studyTimeMin,
            chartData: chartData.length > 0 ? chartData : [{ name: 'Sin datos', value: 0 }],
            lastActive: 'Ver dashboard',
          }
        } catch { data[s.id] = null }
      }
      if (!cancelled) { setStudentsData(data); setLoadingStats(false) }
    }
    load()
    return () => { cancelled = true }
  }, [linkedStudents])

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
            <h1>Panel de Control</h1>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Link2 size={16} /> Vincular estudiante
            </button>
          </div>

          {loadingStats ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <LoaderCircle size={24} className="animate-spin" /> Cargando datos...
            </div>
          ) : linkedStudents.length === 0 ? (
            <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <h2>Sin estudiantes vinculados</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Vincula un estudiante para ver su progreso académico.</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Link2 size={16} /> Vincular estudiante
              </button>
            </div>
          ) : (
            <div className="student-grid">
              {linkedStudents.map(s => {
                const stats = studentsData[s.id]
                const ud = stats?.understanding || 0
                const udColor = ud >= 80 ? '#22C55E' : ud >= 50 ? '#F59E0B' : '#EF4444'
                return (
                  <motion.div key={s.id} className="student-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="student-card-header">
                      <div className="student-avatar">🦊</div>
                      <div className="student-info">
                        <h3>{s.name}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{stats ? `${stats.completedNodes} de ${stats.totalNodes} nodos` : 'Cargando...'}</span>
                      </div>
                      <button className="btn btn-ghost btn-sm icon-btn" onClick={() => handleUnlink(s.linkId)} title="Desvincular">
                        <Unlink size={14} />
                      </button>
                    </div>
                    <div className="student-stats">
                      <div className="stat-pill">
                        <span>Entendimiento</span>
                        <strong style={{ color: udColor }}>{ud}%</strong>
                      </div>
                      <div className="stat-pill">
                        <span>Estudio</span>
                        <strong>{stats?.studyTimeMin || 0} min</strong>
                      </div>
                    </div>
                    <div style={{ height: 100, marginTop: 12 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats?.chartData || []}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vincular modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal}>
            <motion.div className="modal-container" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Vincular estudiante</h2>
                <button className="icon-btn" onClick={handleCloseModal}><X size={18} /></button>
              </div>
              <form onSubmit={handleLink} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Ingresa el correo electrónico del estudiante para enviar una solicitud de vinculación.
                </p>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input className="input-field" style={{ paddingLeft: 40 }} placeholder="estudiante@correo.com" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} autoFocus />
                </div>
                {result && !result.success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FCA5A5', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                    <AlertCircle size={14} /> {result.error}
                  </div>
                )}
                {result && result.success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#86EFAC', fontSize: '0.85rem', background: 'rgba(34,197,94,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                    <CheckCircle size={14} /> Solicitud enviada a {studentEmail}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" disabled={loading || !studentEmail.trim()}>
                  {loading ? <LoaderCircle size={16} className="animate-spin" /> : <><Search size={16} /> Enviar solicitud</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
