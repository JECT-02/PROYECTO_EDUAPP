import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Zap, Trophy, Clock, TrendingUp, Beaker, Layout, Globe, Code, X, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { getStudentEnrollments, listStudentMedals, getProgressForEnrollment, getCourseNodes, isSupabaseConfigured, getUnderstandingData } from '../lib/api'
import { calculateUnderstanding, understandingColor, understandingLabel } from '../lib/understanding'
import { useVoice } from '../context/VoiceContext'
import './Dashboard.css'

const ICON_POOL = [
  { icon: <Beaker size={32} />, color: '#22C55E' },
  { icon: <Layout size={32} />, color: '#6C63FF' },
  { icon: <Globe size={32} />, color: '#F59E0B' },
  { icon: <Code size={32} />, color: '#3B82F6' },
  { icon: <Sparkles size={32} />, color: '#EC4899' },
  { icon: <BookOpen size={32} />, color: '#8B5CF6' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '¡Buenos días'
  if (h < 19) return '¡Buenas tardes'
  return '¡Buenas noches'
}

function buildDailyChallenges(enrollments, progressMap) {
  if (enrollments.length === 0) return []

  const challenges = []
  const withProgress = enrollments.filter(e => (progressMap[e.courseId] || 0) > 0)
  const pool = withProgress.length > 0 ? withProgress : enrollments

  const today = new Date().toISOString().slice(0, 10)
  const daySeed = today.split('-').reduce((sum, part) => sum + parseInt(part, 10), 0)

  function stableSort(arr) {
    return [...arr].sort((a, b) => {
      const ha = (daySeed * 31 + (a.courseId || '').length * 7) % 100
      const hb = (daySeed * 31 + (b.courseId || '').length * 7) % 100
      return ha - hb
    })
  }

  const sorted = stableSort(pool)

  const coliseoCourse = sorted[0]
  if (coliseoCourse?.courseId) {
    challenges.push({
      id: `coliseo-${today}`,
      title: 'Coliseo de Retos',
      icon: <Trophy size={20} />,
      color: '#F59E0B',
      time: '~15 min',
      course: coliseoCourse.course?.title || 'Curso',
      courseId: coliseoCourse.courseId,
      type: 'coliseo',
    })
  }

  if (sorted.length > 1) {
    const reviewCourse = sorted[1]
    const pct = progressMap[reviewCourse.courseId] || 0
    challenges.push({
      id: `review-${today}-${reviewCourse.courseId}`,
      title: pct >= 80 ? 'Examen Final' : pct >= 40 ? 'Quiz de Repaso' : 'Repaso Rápido',
      icon: <Zap size={20} />,
      color: '#22C55E',
      time: pct >= 80 ? '~15 min' : '~8 min',
      course: reviewCourse.course?.title || 'Curso',
      courseId: reviewCourse.courseId,
      type: pct >= 80 ? 'boss' : 'quiz',
    })
  }

  return challenges.slice(0, 2)
}

function statusColor(s) {
  const m = { 'En progreso':'badge-blue','Nuevo':'badge-green','Completado':'badge-purple','Pendiente':'badge-gray' }
  return m[s] || 'badge-gray'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, studentId } = useAuth()
  const { setPageContext } = useVoice()
  const userName = user?.name?.split(' ')[0] || 'Estudiante'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enrollments, setEnrollments] = useState([])
  const [medals, setMedals] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loadingData, setLoadingData] = useState(true)
  const [understanding, setUnderstanding] = useState(null)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [studyTimeMin, setStudyTimeMin] = useState(0)
  const [dailyChallenges, setDailyChallenges] = useState([])
  const [lastActiveEnrollment, setLastActiveEnrollment] = useState(null)
  const [lastActiveInfo, setLastActiveInfo] = useState({ pct: 0, nodeTitle: '', nodeId: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured || !studentId) {
        setLoadingData(false)
        return
      }
      const [{ data: enr }, { data: meds }] = await Promise.all([
        getStudentEnrollments(studentId),
        listStudentMedals(studentId),
      ])
      if (cancelled) return
      const filtered = (enr || []).map((e) => ({
        enrollmentId: e.id,
        courseId: e.course_id,
        course: e.courses,
      })).filter((e) => e.course)
      setEnrollments(filtered)
      setMedals(meds || [])
      setLoadingData(false)

      const progressEntries = await Promise.all(
        filtered.map(async (e) => {
          const [nodesResult, progressResult] = await Promise.all([
            getCourseNodes(e.courseId),
            getProgressForEnrollment(e.enrollmentId),
          ])
          const total = (nodesResult.data || []).length
          const completed = (progressResult.data || []).filter(p => p.state === 'completed').length
          return { courseId: e.courseId, pct: total > 0 ? Math.round((completed / total) * 100) : 0, enrollment: e, prog: progressResult.data || [] }
        })
      )
      if (!cancelled) setProgressMap(Object.fromEntries(progressEntries.map(p => [p.courseId, p.pct])))
      if (!cancelled) {
        const progressObj = Object.fromEntries(progressEntries.map(p => [p.courseId, p.pct]))
        setDailyChallenges(buildDailyChallenges(filtered, progressObj))
      }

      // Find last active enrollment (most recent completed_at from progress)
      let latest = null
      let latestDate = null
      let latestInfo = { pct: 0, nodeTitle: '', nodeId: '' }
      for (const pe of progressEntries) {
        for (const p of pe.prog) {
          if (p.completed_at && (!latestDate || new Date(p.completed_at) > latestDate)) {
            latestDate = new Date(p.completed_at)
            latest = pe.enrollment
            latestInfo.pct = pe.pct
          }
        }
      }
      if (!latest) latest = filtered[0]
      if (cancelled) return
      setLastActiveEnrollment(latest)
      setLastActiveInfo(latestInfo)

      // Load understanding for first course
      const allCompleted = Object.values(Object.fromEntries(progressEntries))
      let sumCompleted = 0; let sumTime = 0
      for (const e of filtered) {
        const { data: ud } = await getUnderstandingData(studentId, e.courseId)
        if (ud) {
          sumCompleted += ud.completedNodes
          sumTime += ud.studyTimeMin
        }
      }
      if (filtered.length > 0) {
        const { data: udFirst } = await getUnderstandingData(studentId, filtered[0].courseId)
        if (!cancelled && udFirst) setUnderstanding(calculateUnderstanding(udFirst))
      }
      if (!cancelled) {
        setTotalCompleted(sumCompleted)
        setStudyTimeMin(sumTime)
      }
    }
    load()
    return () => { cancelled = true }
  }, [studentId])

  // Voice: set page context with course names for navigation
  useEffect(() => {
    if (enrollments.length > 0) {
      const totalCompletedNodes = Object.values(progressMap).reduce((sum, pct) => sum + (pct > 0 ? 1 : 0), 0)
      setPageContext({
        page: 'dashboard',
        courses: enrollments.map(e => e.course?.title || '').filter(Boolean),
        courseIds: enrollments.map(e => e.courseId),
        currentCourseId: enrollments[0]?.courseId,
        totalNodes: totalCompletedNodes,
      })
    } else {
      setPageContext({ page: 'dashboard' })
    }
  }, [enrollments, progressMap, setPageContext])

  // Lock body scroll when mobile drawer is open
  const drawerRef = useRef(null)

  // Lock body scroll + focus trap when mobile drawer is open
  const handleDrawerKeyDown = useCallback((e) => {
    if (e.key !== 'Tab') return
    const drawer = drawerRef.current
    if (!drawer) return
    const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
      // Focus the close button so Tab starts inside the drawer
      requestAnimationFrame(() => {
        const closeBtn = drawerRef.current?.querySelector('.drawer-close-btn')
        closeBtn?.focus()
      })
      document.addEventListener('keydown', handleDrawerKeyDown)
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleDrawerKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleDrawerKeyDown)
    }
  }, [sidebarOpen, handleDrawerKeyDown])

  const sidebarContent = (
    <>
      {/* Mascot panel */}
      <div className="sidebar-card" tabIndex={0} role="region" aria-label={`Tu compañero: ${user?.fullProfile?.pet_name || 'Ember'}, nivel ${Math.floor((user?.fullProfile?.pet_xp || 0) / 500) + 1}. Actual ${(user?.fullProfile?.pet_xp || 0)} XP. Necesitas ${Math.ceil((user?.fullProfile?.pet_xp || 0) / 500) * 500} XP para el siguiente nivel.`}>
        <div aria-hidden="true">
          <h3 className="sidebar-title">Tu compañero</h3>
          <div className="mascot-panel">
            <Mascot type={user?.fullProfile?.pet_type || 'dragon'} size="lg" mood="normal" />
            <div className="mascot-info">
              <div className="mascot-nm">{user?.fullProfile?.pet_name || 'Ember'}</div>
              <div className="mascot-lvl">Nivel {Math.floor((user?.fullProfile?.pet_xp || 0) / 500) + 1}</div>
            </div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-labels">
              <span>{(user?.fullProfile?.pet_xp || 0)} XP</span><span>{Math.ceil((user?.fullProfile?.pet_xp || 0) / 500) * 500} XP</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${Math.min(((user?.fullProfile?.pet_xp || 0) % 500) / 500 * 100, 100)}%`, background:'linear-gradient(90deg,#F59E0B,#8B5CF6)'}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="sidebar-card" tabIndex={0} role="region" aria-label={`Estadísticas: ${studyTimeMin} minutos de estudio, ${totalCompleted} nodos completados, ${understanding ? understanding.value : 0} por ciento de entendimiento, ${medals.length} medallas`}>
        <div aria-hidden="true">
          <h3 className="sidebar-title">Tu progreso</h3>
          <div className="stats-list">
            {[
              { label:'Tiempo de estudio', val: studyTimeMin > 0 ? `${Math.floor(studyTimeMin/60)}h ${studyTimeMin%60}min` : '—', icon:<Clock size={14}/>, color:'#6C63FF' },
              { label:'Nodos completados', val: String(totalCompleted), icon:<BookOpen size={14}/>, color:'#22C55E' },
              { label:'Nivel de entendimiento', val: understanding ? `${understanding.value}%` : '—', icon:<TrendingUp size={14}/>, color: understanding ? understandingColor(understanding.value) : '#F59E0B' },
              { label:'Medallas obtenidas', val: String(medals.length), icon:<Trophy size={14}/>, color:'#8B5CF6' },
            ].map(s => (
              <div key={s.label} className="stat-item">
                <div className="stat-icon" style={{color:s.color, background:`${s.color}18`}}>{s.icon}</div>
                <div className="stat-info">
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Last medal */}
      {medals.length > 0 ? (
        <div className="sidebar-card medal-card">
          <div className="medal-icon-wrap" style={{ fontSize: '2rem' }}>🏅</div>
          <div className="medal-info">
            <div className="medal-name">{medals[0].name || medals[0].achievement || 'Medalla'}</div>
            <div className="medal-sub">Última medalla obtenida</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/achievements')} aria-label={`Última medalla: ${medals[0].name || 'Medalla'}. Ir a logros`}>Ver todas</button>
        </div>
      ) : (
        <div className="sidebar-card" style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Aún no tienes medallas. ¡Completa quizzes para ganarlas!
        </div>
      )}
    </>
  )

  return (
    <PageWrapper>
      <Header onToggleSidebar={() => setSidebarOpen(true)} />
      <div className="dashboard-layout">
        {/* Main content */}
        <div className="dashboard-main">
          {/* Greeting */}
          <section aria-label="Bienvenida y progreso">
          <div className="greeting-row" aria-label={`${getGreeting()}, ${userName}. ${dailyChallenges.length > 0 ? `Tienes ${dailyChallenges.length} reto${dailyChallenges.length !== 1 ? 's' : ''} pendiente${dailyChallenges.length !== 1 ? 's' : ''} hoy` : 'Sin retos pendientes por hoy'}`}>
            <div>
              <h1 className="greeting-text">{getGreeting()}, {userName}!</h1>
              <p className="greeting-sub">{dailyChallenges.length > 0 ? `Tienes ${dailyChallenges.length} reto${dailyChallenges.length !== 1 ? 's' : ''} pendiente${dailyChallenges.length !== 1 ? 's' : ''} hoy` : 'Sin retos pendientes por hoy'}</p>
            </div>
          </div>

          {/* Continue card */}
          {(() => {
            const continueEnrollment = lastActiveEnrollment
            const continueCourse = continueEnrollment?.course
            if (!continueCourse) {
              return (
                <motion.div
                  className="continue-card"
                  onClick={() => navigate('/explore')}
                  style={{ cursor:'pointer', '--course-color': '#6C63FF' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/explore'); } }}
                  aria-label="No tienes cursos aún. Explora el catálogo para inscribirte"
                >
                  <div className="continue-content">
                    <div className="continue-badge badge badge-purple">Explorar</div>
                    <h2 className="continue-title">No tienes cursos aún</h2>
                    <p className="continue-node">Explora el catálogo e inscríbete en un curso con un código de invitación.</p>
                    <button
                      className="btn btn-primary"
                      style={{width:'fit-content', marginTop:16}}
                      onClick={(e) => { e.stopPropagation(); navigate('/explore') }}
                      aria-label="Ir al catálogo de cursos"
                    >
                      Ver catálogo
                    </button>
                  </div>
                  <div className="continue-art" aria-hidden="true"><BookOpen size={80}/></div>
                </motion.div>
              )
            }
            const continuePct = continueCourse ? (progressMap[continueCourse.id] || lastActiveInfo.pct || 0) : 0
            return (
              <motion.div
                className="continue-card"
                onClick={() => navigate(`/roadmap/${continueCourse.id}`)}
                style={{ cursor:'pointer', '--course-color': ICON_POOL[0].color }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/roadmap/${continueCourse.id}`); } }}
                aria-label={`Continuar curso: ${continueCourse.title}, ${continuePct} por ciento completado`}
              >
                <div className="continue-content">
                  <div className="continue-badge badge badge-green">Continuar</div>
                  <h2 className="continue-title">{continueCourse.title}</h2>
                  <p className="continue-node">{continueCourse.profiles?.full_name ? `Prof. ${continueCourse.profiles.full_name}` : 'Continúa donde quedaste'}</p>
                  <div className="continue-progress">
                    <div className="progress-bar" style={{flex:1}}>
                      <div className="progress-fill" style={{width:`${continuePct}%`, background:'linear-gradient(90deg,#22C55E,#4ADE80)'}}/>
                    </div>
                    <span className="continue-pct">{continuePct}%</span>
                  </div>
                  <button
                    className="btn btn-success"
                    style={{width:'fit-content', marginTop:16}}
                    onClick={(e) => { e.stopPropagation(); navigate(`/roadmap/${continueCourse.id}`) }}
                    aria-label={`Continuar sesión de ${continueCourse.title}`}
                  >
                    ▶ Continuar sesión
                  </button>
                </div>
                <div className="continue-art" aria-hidden="true"><Beaker size={80}/></div>
              </motion.div>
            )
          })()}

          </section>

          {/* Challenges */}
          <section aria-label="Retos del día">
            <h2 className="section-title">Retos del día</h2>
            <div className="challenges-row">
              {dailyChallenges.map(c => (
                <motion.div
                  key={c.id} className="challenge-card"
                  whileTap={{ scale:0.97 }}
                  onClick={() => {
                    if (c.type === 'coliseo') navigate(c.courseId ? `/coliseo/${c.courseId}` : '/coliseo')
                    else navigate(`/roadmap/${c.courseId}`)
                  }}
                  style={{ cursor:'pointer', '--course-color': c.color }}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (c.type === 'coliseo') navigate(c.courseId ? `/coliseo/${c.courseId}` : '/coliseo'); else navigate(`/roadmap/${c.courseId}`) } }}
                  aria-label={`${c.title}: ${c.course}`}
                >
                  <div className="ch-icon" style={{ background:`${c.color}18`, color:c.color }}>{c.icon}</div>
                  <div className="ch-info">
                    <span className="badge badge-purple" style={{ marginBottom: 4 }}>{c.course}</span>
                    <div className="ch-title">{c.title}</div>
                    <div className="ch-time"><Clock size={12}/> {c.time}</div>
                  </div>
                  <Zap size={16} style={{ color:c.color, flexShrink:0 }}/>
                </motion.div>
              ))}
              {dailyChallenges.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Inscríbete en cursos para recibir retos diarios.</p>
              )}
            </div>
          </section>

          {/* My courses */}
          <section aria-label="Mis cursos">
            <div className="section-header">
              <h2 className="section-title">Mis Cursos</h2>
            </div>
            {enrollments.length === 0 ? (
              <div className="empty-state card" style={{ padding: 32, textAlign: 'center' }} role="status" aria-label="No estás inscrito en ningún curso">
                <p style={{ color: 'var(--text-muted)' }}>Aún no estás inscrito en ningún curso. Visita <a href="#/explore" onClick={(e) => { e.preventDefault(); navigate('/explore') }}>Explorar</a> para inscribirte con un código.</p>
              </div>
            ) : (
              <div className="courses-grid">
                {enrollments.map((e, i) => {
                  const c = e.course
                  const visual = ICON_POOL[i % ICON_POOL.length]
                  const pct = progressMap[c.id] || 0
                  return (
                    <motion.div
                      key={e.enrollmentId}
                      className="course-card"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/roadmap/${c.id}`); } }}
                      initial={{ opacity:0, y:20 }}
                      animate={{ opacity:1, y:0, transition:{ delay: i*0.08 } }}
                      onClick={() => navigate(`/roadmap/${c.id}`)}
                      style={{ cursor:'pointer', '--course-color': visual.color }}
                      aria-label={`${c.title}, ${c.profiles?.full_name || 'Docente'}: En progreso, ${pct} por ciento completado`}
                    >
                      <div className="course-cover" aria-hidden="true" style={{ background:`linear-gradient(135deg,${visual.color}44,${visual.color}11)` }}>
                        <div style={{ color: visual.color }}>{visual.icon}</div>
                      </div>
                      <div className="course-body">
                        <div className="course-header-row">
                          <span className="badge badge-blue">En progreso</span>
                        </div>
                        <h3 className="course-title">{c.title}</h3>
                        <p className="course-teacher">{c.profiles?.full_name || 'Docente'}</p>
                        <div className="course-progress-row">
                          <div className="progress-bar" style={{flex:1}}>
                            <div className="progress-fill" style={{width:`${pct}%`, background:`linear-gradient(90deg,${visual.color},${visual.color}aa)`}}/>
                          </div>
                          <span className="course-pct" style={{color:visual.color}}>{pct}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar — desktop */}
        <aside className="dashboard-sidebar hide-tablet" aria-label="Panel de información">
          {sidebarContent}
        </aside>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="sidebar-overlay"
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              key="sidebar-drawer"
              ref={drawerRef}
              tabIndex={-1}
              className="dashboard-sidebar mobile-drawer"
              aria-label="Panel de información"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="drawer-header">
                <h3 className="sidebar-title" style={{ marginBottom: 0 }}>Panel</h3>
                <button
                  className="drawer-close-btn"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Cerrar panel"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="drawer-body">
                {sidebarContent}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}
