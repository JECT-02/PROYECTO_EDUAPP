import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Users, AlertTriangle, TrendingUp, Clock,
  BrainCircuit, Search, Plus, Check, Hash,
  UserPlus, Mail, IdCard, LoaderCircle, Trash2, Eye
} from 'lucide-react'
import { searchStudents, getCourseEnrollmentsWithProgress, addStudentToCourse } from '../lib/api'

export default function CourseDetailModal({ isOpen, onClose, course, onDelete }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('participantes')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  // Real data state
  const [participants, setParticipants] = useState([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState([])
  const [addSearching, setAddSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [addError, setAddError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const searchRef = useRef(null)

  // Reset state when switching to a different course
  useEffect(() => {
    setShowDeleteModal(false)
    setConfirmText('')
    setActiveTab('participantes')
    setSearchQuery('')
    setAddOpen(false)
    setAddQuery('')
    setAddResults([])
    setAddError('')
  }, [course?.id])

  // Load participants from DB whenever the modal opens or refreshes
  useEffect(() => {
    if (!isOpen || !course?.id) return
    let cancelled = false
    async function load() {
      setLoadingParticipants(true)
      const { data } = await getCourseEnrollmentsWithProgress(course.id)
      if (cancelled) return
      setParticipants(data || [])
      setLoadingParticipants(false)
    }
    load()
    return () => { cancelled = true }
  }, [isOpen, course?.id, refreshTick])

  // Debounced search
  useEffect(() => {
    if (!addOpen) return
    if (!addQuery.trim()) {
      setAddResults([])
      return
    }
    setAddSearching(true)
    setAddError('')
    const t = setTimeout(async () => {
      try {
        const { data, error } = await searchStudents(addQuery.trim())
        if (error) {
          console.warn('[searchStudents]', error)
          setAddError(error.message || 'Error al buscar estudiantes.')
          setAddResults([])
          setAddSearching(false)
          return
        }
        const enrolled = new Set(participants.map((p) => p.studentId))
        const results = (data || []).map(s => ({
          ...s,
          alreadyEnrolled: enrolled.has(s.id),
        }))
        console.log('[CourseDetailModal] search results:', results.length, '| enrolled filter:', enrolled.size, '| query:', addQuery.trim())
        setAddResults(results)
      } catch (err) {
        console.error('[searchStudents] exception:', err)
        setAddError('Error de conexion al buscar estudiantes.')
        setAddResults([])
      }
      setAddSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [addQuery, addOpen, participants])

  if (!course) return null

  const deleteSlug = `eliminar_${course.name.toLowerCase().replace(/\s+/g, '_')}`

  const filteredParticipants = participants.filter(p =>
    (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.dni || '').includes(searchQuery)
  )

  const activeAlerts = [] // se podría calcular a partir de lastActive (inactividad)
  const now = Date.now()
  for (const p of participants) {
    if (!p.lastActive) continue
    const last = new Date(p.lastActive).getTime()
    const days = (now - last) / (1000 * 60 * 60 * 24)
    if (days > 5) {
      activeAlerts.push({
        id: `inact-${p.studentId}`,
        student: p.fullName,
        type: 'inactividad',
        detail: `Sin actividad hace ${Math.round(days)} días en este curso`,
        severity: 'error',
        avatar: p.avatar,
      })
    }
    if (p.completedNodes > 0 && p.progress < 35) {
      activeAlerts.push({
        id: `diff-${p.studentId}`,
        student: p.fullName,
        type: 'dificultad',
        detail: `Rendimiento bajo (${p.progress}%) — requiere refuerzo`,
        severity: 'warning',
        avatar: p.avatar,
      })
    }
  }
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const order = { error: 0, warning: 1 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  const avgProgress = participants.length > 0
    ? Math.round(participants.reduce((s, p) => s + p.progress, 0) / participants.length)
    : 0
  const activeCount = participants.filter((p) => p.lastActive && (now - new Date(p.lastActive).getTime()) < 2 * 24 * 60 * 60 * 1000).length

  async function handleAddStudent(student) {
    setAdding(student.id)
    setAddError('')
    const { error } = await addStudentToCourse({ courseId: course.id, studentId: student.id })
    setAdding(null)
    if (error) {
      setAddError(error.message || 'No se pudo agregar al estudiante.')
      return
    }
    setAddQuery('')
    setAddResults([])
    setRefreshTick((t) => t + 1)
  }

  function copyInvite() {
    if (course.inviteCode) {
      navigator.clipboard?.writeText(course.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="course-detail-overlay"
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            key="course-detail-container"
            className="modal-container course-detail-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ marginBottom: 4 }}>{course.name}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {participants.length} {participants.length === 1 ? 'participante' : 'participantes'}
                  </span>
                  {course.inviteCode && (
                    <button
                      type="button"
                      onClick={copyInvite}
                      title="Copiar código de invitación"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(108,99,255,0.12)',
                        border: '1px solid rgba(108,99,255,0.3)',
                        color: 'var(--primary-light)',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'SF Mono, Fira Code, monospace',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {copied ? <><Check size={12} /> Copiado</> : <><Hash size={12} /> {course.inviteCode}</>}
                    </button>
                  )}
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
                {participants.length > 0 && (
                  <span className="course-detail-tab-badge">{participants.length}</span>
                )}
              </button>
              <button
                className={`course-detail-tab ${activeTab === 'alertas' ? 'active' : ''}`}
                onClick={() => setActiveTab('alertas')}
              >
                <AlertTriangle size={16} />
                Alertas
                {sortedAlerts.length > 0 && (
                  <span className="course-detail-tab-badge alert">{sortedAlerts.length}</span>
                )}
              </button>
            </div>

            {/* Body */}
            <div className="modal-body course-detail-body">
              {activeTab === 'participantes' && (
                <>
                  {/* Toolbar: filter participants + add button */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
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
                        placeholder="Filtrar participantes..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setAddOpen((v) => !v)}
                    >
                      <UserPlus size={16} />
                      {addOpen ? 'Cancelar' : 'Agregar alumno'}
                    </button>
                  </div>

                  {/* Add-student panel */}
                  <AnimatePresence>
                    {addOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div
                          ref={searchRef}
                          style={{
                            background: 'rgba(108,99,255,0.06)',
                            border: '1px solid rgba(108,99,255,0.2)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Buscar estudiante por email, DNI o nombre y agrégalo al curso.
                          </div>
                          <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                            <input
                              autoFocus
                              className="input-field"
                              style={{ paddingLeft: 36 }}
                              placeholder="ej. juan@gmail.com, 12345678, Juan Pérez"
                              value={addQuery}
                              onChange={(e) => setAddQuery(e.target.value)}
                            />
                          </div>
                          {addSearching && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              <LoaderCircle size={14} className="animate-spin" /> Buscando...
                            </div>
                          )}
                          {addError && (
                            <div style={{ color: '#FCA5A5', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 6 }}>{addError}</div>
                          )}
                          {!addSearching && !addError && addQuery.trim() && addResults.length === 0 && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                              No se encontraron estudiantes con ese criterio.
                            </div>
                          )}
                          {addResults.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {addResults.map((s) => (
                                <div
                                  key={s.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: 10,
                                    background: s.alreadyEnrolled ? 'rgba(34,197,94,0.06)' : 'var(--surface)',
                                    border: s.alreadyEnrolled ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--border-light)',
                                    borderRadius: 'var(--radius)',
                                  }}
                                >
                                  <div style={{ fontSize: '1.5rem' }}>{s.avatar_id || '🦊'}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.full_name || 'Sin nombre'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                      <span><Mail size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {s.email}</span>
                                      {s.dni && <span><IdCard size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {s.dni}</span>}
                                    </div>
                                  </div>
                                  {s.alreadyEnrolled ? (
                                    <span style={{
                                      fontSize: '0.75rem',
                                      color: 'var(--success)',
                                      fontWeight: 700,
                                      padding: '4px 10px',
                                      borderRadius: 999,
                                      background: 'rgba(34,197,94,0.12)',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      <Check size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                      Ya inscrito
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      disabled={adding === s.id}
                                      onClick={() => handleAddStudent(s)}
                                    >
                                      {adding === s.id ? <LoaderCircle size={14} className="animate-spin" /> : <><Plus size={14} /> Agregar</>}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                        {avgProgress}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Progreso promedio</div>
                    </div>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#A78BFA' }}>
                        {activeCount}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Activos (últ. 48h)</div>
                    </div>
                  </div>

                  {/* Participants list */}
                  {loadingParticipants ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      <LoaderCircle size={24} className="animate-spin" style={{ display: 'inline-block' }} />
                    </div>
                  ) : (
                  <div className="participants-table-wrapper">
                    <div className="participants-table-inner">
                      <div className="participants-header-row">
                        <span style={{ flex: '0 0 200px' }}>Estudiante</span>
                        <span style={{ flex: '0 0 120px', textAlign: 'center' }}>Progreso</span>
                        <span style={{ flex: '0 0 120px', textAlign: 'center' }}>Nodos</span>
                        <span style={{ flex: '0 0 100px', textAlign: 'right' }}>Última act.</span>
                      </div>
                      {filteredParticipants.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                          {participants.length === 0
                            ? 'Aún no hay estudiantes inscritos. Usa "Agregar alumno" para añadir uno.'
                            : 'No se encontraron participantes con ese criterio.'}
                        </div>
                      ) : (
                        filteredParticipants.map((p, i) => {
                          const lastDays = p.lastActive
                            ? Math.floor((now - new Date(p.lastActive).getTime()) / (1000 * 60 * 60 * 24))
                            : null
                          const lastLabel = lastDays === null
                            ? '—'
                            : lastDays === 0
                              ? 'Hoy'
                              : lastDays === 1
                                ? 'Ayer'
                                : `Hace ${lastDays}d`
                          return (
                            <motion.div
                              key={p.studentId}
                              className="participant-row"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                            >
                              <div style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="participant-avatar">{p.avatar}</div>
                                <div style={{ minWidth: 0 }}>
                                  <div className="participant-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.fullName}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{p.email}</div>
                                </div>
                                {lastDays !== null && lastDays > 5 && (
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
                              <div style={{ flex: '0 0 120px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {p.completedNodes}/{p.totalNodes}
                              </div>
                              <div style={{ flex: '0 0 100px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                {lastDays === 0 ? <span style={{ color: '#22C55E' }}>Hoy</span> : <span>{lastLabel}</span>}
                              </div>
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Ver progreso del estudiante"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/roadmap/${course.id}?studentId=${p.studentId}&studentName=${encodeURIComponent(p.fullName)}`)
                                  onClose()
                                }}
                                style={{ flex: '0 0 auto', marginLeft: 8 }}
                              >
                                <Eye size={14} />
                              </button>
                            </motion.div>
                          )
                        })
                      )}
                    </div>
                  </div>
                  )}
                </>
              )}

              {activeTab === 'alertas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444' }}>
                        {sortedAlerts.filter(a => a.severity === 'error').length}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Inactividad</div>
                    </div>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F97316' }}>
                        {sortedAlerts.filter(a => a.severity === 'warning').length}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Dificultades</div>
                    </div>
                    <div className="detail-stat-card">
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22C55E' }}>
                        {participants.filter((p) => p.progress >= 80).length}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Destacados</div>
                    </div>
                  </div>

                  {sortedAlerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                      No hay alertas. Todos los estudiantes tienen actividad reciente.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {onDelete && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--error)' }}
                    onClick={() => { setShowDeleteModal(true); setConfirmText('') }}
                  >
                    <Trash2 size={14} />
                    Eliminar curso
                  </button>
                )}
              </div>
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <motion.div
          key="delete-confirm-overlay"
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <motion.div
            key="delete-confirm-container"
            className="modal-container"
            style={{ maxWidth: 420 }}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} />
                Eliminar curso
              </h2>
              <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ gap: 16 }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Esta accion <strong style={{ color: 'var(--error)' }}>no se puede deshacer</strong>.
                Se eliminaran permanentemente el curso y todo su contenido asociado.
              </p>

              <div style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                fontSize: '0.82rem',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Curso: <span style={{ color: 'var(--text)' }}>"{course.name}"</span>
                </div>
                <div style={{ color: 'var(--text-dim)' }}>
                  {participants.length} estudiantes &middot; {course.nodes} nodos
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{
                  fontSize: '0.8rem', color: 'var(--text-dim)',
                  fontWeight: 600,
                }}>
                  Escribe <code style={{
                    background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4,
                    fontSize: '0.78rem', color: 'var(--error)',
                  }}>{deleteSlug}</code> para confirmar
                </label>
                <input
                  className="input-field"
                  placeholder={deleteSlug}
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn"
                style={{
                  background: confirmText === deleteSlug
                    ? 'rgba(239,68,68,0.9)'
                    : 'rgba(239,68,68,0.25)',
                  color: confirmText === deleteSlug
                    ? '#fff'
                    : '#888',
                  border: confirmText === deleteSlug
                    ? '1px solid rgba(239,68,68,0.6)'
                    : '1px solid transparent',
                  cursor: confirmText === deleteSlug
                    ? 'pointer'
                    : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
                disabled={confirmText !== deleteSlug}
                onClick={() => { onDelete(course.id); setShowDeleteModal(false) }}
              >
                Eliminar permanentemente
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
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
