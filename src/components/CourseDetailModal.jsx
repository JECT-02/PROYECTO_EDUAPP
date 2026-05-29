import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Users, AlertTriangle, TrendingUp, Clock,
  BrainCircuit, Search
} from 'lucide-react'

const PARTICIPANT_DATA = {
  1: [
    { id: 1, name: 'Sofia G.', avatar: '🦊', progress: 78, understanding: 82, lastActive: 'Hoy', alerts: [] },
    { id: 2, name: 'Juan P.', avatar: '🐺', progress: 45, understanding: 38, lastActive: 'Hace 3 dias', alerts: ['dificultad'] },
    { id: 3, name: 'Maria G.', avatar: '🐱', progress: 30, understanding: 55, lastActive: 'Hace 5 dias', alerts: ['inactividad', 'dificultad'] },
    { id: 4, name: 'Carlos R.', avatar: '🐶', progress: 90, understanding: 88, lastActive: 'Hoy', alerts: [] },
    { id: 5, name: 'Ana L.', avatar: '🐰', progress: 60, understanding: 65, lastActive: 'Hace 1 dia', alerts: [] },
    { id: 6, name: 'Luis M.', avatar: '🐸', progress: 25, understanding: 30, lastActive: 'Hace 7 dias', alerts: ['inactividad'] },
  ],
  2: [
    { id: 7, name: 'Pedro H.', avatar: '🐲', progress: 55, understanding: 60, lastActive: 'Hace 2 dias', alerts: [] },
    { id: 8, name: 'Lucia F.', avatar: '🦋', progress: 80, understanding: 75, lastActive: 'Hoy', alerts: [] },
    { id: 9, name: 'Diego A.', avatar: '🦁', progress: 35, understanding: 40, lastActive: 'Hace 4 dias', alerts: ['dificultad'] },
  ],
  3: [
    { id: 10, name: 'Valeria T.', avatar: '🐧', progress: 20, understanding: 45, lastActive: 'Hoy', alerts: [] },
    { id: 11, name: 'Mateo S.', avatar: '🐯', progress: 10, understanding: 25, lastActive: 'Hace 6 dias', alerts: ['inactividad'] },
  ],
}

const COURSE_ALERTS = {
  1: [
    { id: 'a1', student: 'Juan P.', type: 'dificultad', detail: 'Dificultad persistente en "La Mitocondria"', severity: 'warning' },
    { id: 'a2', student: 'Maria G.', type: 'inactividad', detail: '5 dias sin actividad en el curso', severity: 'error' },
    { id: 'a3', student: 'Maria G.', type: 'dificultad', detail: 'Dificultad en "Membrana celular"', severity: 'warning' },
    { id: 'a4', student: 'Luis M.', type: 'inactividad', detail: '7 dias sin actividad en el curso', severity: 'error' },
    { id: 'a5', student: 'Carlos R.', type: 'destacado', detail: 'Rendimiento destacado - 88% de comprension', severity: 'success' },
  ],
  2: [
    { id: 'b1', student: 'Diego A.', type: 'dificultad', detail: 'Dificultad en "Sistema digestivo"', severity: 'warning' },
    { id: 'b2', student: 'Pedro H.', type: 'inactividad', detail: '2 dias sin actividad en el curso', severity: 'warning' },
  ],
  3: [
    { id: 'c1', student: 'Mateo S.', type: 'inactividad', detail: '6 dias sin actividad en el curso', severity: 'error' },
  ],
}

function getUnderstandingColor(val) {
  if (val >= 80) return '#22C55E'
  if (val >= 60) return '#F59E0B'
  return '#EF4444'
}

function getUnderstandingLabel(val) {
  if (val >= 80) return 'Alto'
  if (val >= 60) return 'Medio'
  return 'Bajo'
}

function getSeverityStyle(severity) {
  const map = {
    warning: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', dot: '#F97316', iconColor: '#F97316' },
    error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', dot: '#EF4444', iconColor: '#EF4444' },
    success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', dot: '#22C55E', iconColor: '#22C55E' },
  }
  return map[severity] || map.warning
}

function getAlertIcon(type) {
  const map = {
    dificultad: <BrainCircuit size={14} />,
    inactividad: <Clock size={14} />,
    destacado: <TrendingUp size={14} />,
  }
  return map[type] || <AlertTriangle size={14} />
}

function getAlertTypeLabel(type) {
  const map = {
    dificultad: 'Dificultad',
    inactividad: 'Inactividad',
    destacado: 'Destacado',
  }
  return map[type] || type
}

export default function CourseDetailModal({ isOpen, onClose, course, onDelete }) {
  const [activeTab, setActiveTab] = useState('participantes')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!course) return null

  const participants = PARTICIPANT_DATA[course.id] || []
  const alerts = COURSE_ALERTS[course.id] || []

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeAlerts = alerts.filter(a => a.severity !== 'success')
  const destacados = alerts.filter(a => a.severity === 'success')

  // Sort: inactividad first (most severe), then dificultad
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const order = { error: 0, warning: 1 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className="modal-container course-detail-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <h2>{course.name}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {participants.length} participantes
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 28px' }}>
              <button
                className={`course-detail-tab ${activeTab === 'participantes' ? 'active' : ''}`}
                onClick={() => setActiveTab('participantes')}
              >
                <Users size={16} />
                Participantes
                {activeAlerts.length > 0 && (
                  <span className="course-detail-tab-badge">{activeAlerts.length}</span>
                )}
              </button>
              <button
                className={`course-detail-tab ${activeTab === 'alertas' ? 'active' : ''}`}
                onClick={() => setActiveTab('alertas')}
              >
                <AlertTriangle size={16} />
                Alertas
                {activeAlerts.length > 0 && (
                  <span className="course-detail-tab-badge alert">{activeAlerts.length}</span>
                )}
              </button>
            </div>

            {/* Body */}
            <div className="modal-body course-detail-body">
              {activeTab === 'participantes' && (
                <>
                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={16}
                      style={{
                        position: 'absolute', left: 14, top: '50%',
                        transform: 'translateY(-50%)', color: 'var(--text-dim)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      className="input-field"
                      style={{ paddingLeft: 40 }}
                      placeholder="Buscar participante..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Summary stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                        {participants.length}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Participantes</div>
                    </div>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22C55E' }}>
                        {Math.round(participants.reduce((s, p) => s + p.progress, 0) / participants.length)}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Progreso promedio</div>
                    </div>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#A78BFA' }}>
                        {Math.round(participants.reduce((s, p) => s + p.understanding, 0) / participants.length)}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Comprension promedio</div>
                    </div>
                  </div>

                  {/* Participants list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="participants-header-row">
                      <span style={{ flex: '0 0 200px' }}>Estudiante</span>
                      <span style={{ flex: '0 0 120px', textAlign: 'center' }}>Progreso</span>
                      <span style={{ flex: '0 0 120px', textAlign: 'center' }}>Entendimiento</span>
                      <span style={{ flex: '0 0 100px', textAlign: 'right' }}>Estado</span>
                    </div>
                    {filteredParticipants.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                        No se encontraron participantes con ese nombre.
                      </div>
                    ) : (
                      filteredParticipants.map((p, i) => (
                        <motion.div
                          key={p.id}
                          className="participant-row"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="participant-avatar">{p.avatar}</div>
                            <div>
                              <div className="participant-name">{p.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{p.lastActive}</div>
                            </div>
                            {p.alerts.length > 0 && (
                              <AlertTriangle size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                            )}
                          </div>
                          <div style={{ flex: '0 0 120px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${p.progress}%`,
                                  background: `linear-gradient(90deg, ${p.progress >= 60 ? '#22C55E' : p.progress >= 30 ? '#F59E0B' : '#EF4444'}, ${p.progress >= 60 ? '#4ADE80' : p.progress >= 30 ? '#FCD34D' : '#FCA5A5'})`,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '0.78rem', fontWeight: 700, minWidth: 35, textAlign: 'right',
                                color: p.progress >= 60 ? '#22C55E' : p.progress >= 30 ? '#F59E0B' : '#EF4444',
                              }}
                            >
                              {p.progress}%
                            </span>
                          </div>
                          <div style={{ flex: '0 0 120px', textAlign: 'center' }}>
                            <div
                              className="understanding-dot"
                              style={{
                                background: `${getUnderstandingColor(p.understanding)}22`,
                                borderColor: `${getUnderstandingColor(p.understanding)}44`,
                                color: getUnderstandingColor(p.understanding),
                              }}
                            >
                              {getUnderstandingLabel(p.understanding)}
                            </div>
                          </div>
                          <div style={{ flex: '0 0 100px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            {p.lastActive === 'Hoy' ? (
                              <span style={{ color: '#22C55E' }}>Activo</span>
                            ) : (
                              <span>{p.lastActive}</span>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              )}

              {activeTab === 'alertas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444' }}>
                        {activeAlerts.filter(a => a.severity === 'error').length}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Inactividad</div>
                    </div>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F97316' }}>
                        {activeAlerts.filter(a => a.severity === 'warning').length}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Dificultades</div>
                    </div>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22C55E' }}>
                        {destacados.length}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Destacados</div>
                    </div>
                  </div>

                  {/* Alerts list */}
                  {sortedAlerts.length === 0 && destacados.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: 40, color: 'var(--text-dim)',
                      fontSize: '0.88rem',
                    }}>
                      No hay alertas para este curso.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Active alerts */}
                      {sortedAlerts.map(a => {
                        const s = getSeverityStyle(a.severity)
                        return (
                          <motion.div
                            key={a.id}
                            className="alert-row"
                            style={{ background: s.bg, border: `1px solid ${s.border}` }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <div className="alert-row-dot" style={{ background: s.dot }} />
                            <div className="alert-row-icon" style={{ color: s.iconColor }}>
                              {getAlertIcon(a.type)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="alert-row-student">{a.student}</div>
                              <div className="alert-row-detail">{a.detail}</div>
                            </div>
                            <span className="badge" style={{
                              background: `${s.dot}18`, color: s.dot,
                              fontSize: '0.65rem', textTransform: 'uppercase',
                            }}>
                              {getAlertTypeLabel(a.type)}
                            </span>
                          </motion.div>
                        )
                      })}

                      {/* Destacados */}
                      {destacados.length > 0 && (
                        <>
                          <div style={{
                            fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            padding: '8px 0 4px', marginTop: 8,
                          }}>
                            Destacados
                          </div>
                          {destacados.map(a => {
                            const s = getSeverityStyle(a.severity)
                            return (
                              <motion.div
                                key={a.id}
                                className="alert-row"
                                style={{ background: s.bg, border: `1px solid ${s.border}` }}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                              >
                                <div className="alert-row-dot" style={{ background: s.dot }} />
                                <div className="alert-row-icon" style={{ color: s.iconColor }}>
                                  {getAlertIcon(a.type)}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div className="alert-row-student">{a.student}</div>
                                  <div className="alert-row-detail">{a.detail}</div>
                                </div>
                                <span className="badge" style={{
                                  background: `${s.dot}18`, color: s.dot,
                                  fontSize: '0.65rem', textTransform: 'uppercase',
                                }}>
                                  {getAlertTypeLabel(a.type)}
                                </span>
                              </motion.div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {onDelete && !showDeleteConfirm && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--error)' }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <AlertTriangle size={14} />
                    Eliminar curso
                  </button>
                )}
                {onDelete && showDeleteConfirm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--error)' }}>¿Eliminar "{course.name}"?</span>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(239,68,68,0.15)',
                        color: '#FCA5A5',
                        border: '1px solid rgba(239,68,68,0.3)',
                      }}
                      onClick={() => { onDelete(course.id); setShowDeleteConfirm(false) }}
                    >
                      Si, eliminar
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
