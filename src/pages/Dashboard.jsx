import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Zap, Trophy, Clock, TrendingUp, Beaker, Layout, Globe, Code, X, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { getStudentEnrollments, listStudentMedals, getProgressForEnrollment, getCourseNodes, isSupabaseConfigured } from '../lib/api'
import './Dashboard.css'

const ICON_POOL = [
  { icon: <Beaker size={32} />, color: '#22C55E' },
  { icon: <Layout size={32} />, color: '#6C63FF' },
  { icon: <Globe size={32} />, color: '#F59E0B' },
  { icon: <Code size={32} />, color: '#3B82F6' },
  { icon: <Sparkles size={32} />, color: '#EC4899' },
  { icon: <BookOpen size={32} />, color: '#8B5CF6' },
]

const CHALLENGES = [
  { title:'Repaso: División Celular', time:'~8 min', icon:<Beaker size={20}/>, color:'#22C55E', course:'Biología Celular' },
  { title:'Coliseo de Retos', icon:<Trophy size={20}/>, color:'#22C55E', time:'30 min', course:'Biología Celular' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '¡Buenos días'
  if (h < 19) return '¡Buenas tardes'
  return '¡Buenas noches'
}

function statusColor(s) {
  const m = { 'En progreso':'badge-blue','Nuevo':'badge-green','Completado':'badge-purple','Pendiente':'badge-gray' }
  return m[s] || 'badge-gray'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, studentId } = useAuth()
  const userName = user?.name?.split(' ')[0] || 'Estudiante'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enrollments, setEnrollments] = useState([])
  const [medals, setMedals] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loadingData, setLoadingData] = useState(true)

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
          return [e.courseId, total > 0 ? Math.round((completed / total) * 100) : 0]
        })
      )
      if (!cancelled) setProgressMap(Object.fromEntries(progressEntries))
    }
    load()
    return () => { cancelled = true }
  }, [studentId])

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
      <div className="sidebar-card" tabIndex={0} role="region" aria-label="Tu compañero: Ember, nivel 2 juvenil, 820 de 1500 puntos de experiencia, 55 por ciento, 680 XP para nivel 3">
        <div aria-hidden="true">
          <h3 className="sidebar-title">Tu compañero</h3>
          <div className="mascot-panel">
            <Mascot type="dragon" size="lg" mood="normal" />
            <div className="mascot-info">
              <div className="mascot-nm">Ember</div>
              <div className="mascot-lvl">Nivel 2 – Juvenil</div>
            </div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-labels">
              <span>820 XP</span><span>1500 XP</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width:'55%', background:'linear-gradient(90deg,#EF4444,#F97316)'}}/>
            </div>
            <p className="xp-hint">680 XP para nivel 3</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="sidebar-card" tabIndex={0} role="region" aria-label="Tu semana: 4 horas 20 minutos de estudio, 8 nodos completados, 72 por ciento de entendimiento, 5 medallas obtenidas">
        <div aria-hidden="true">
          <h3 className="sidebar-title">Tu semana</h3>
          <div className="stats-list">
            {[
              { label:'Tiempo de estudio', val:'4h 20min', icon:<Clock size={14}/>, color:'#6C63FF' },
              { label:'Nodos completados', val:'8', icon:<BookOpen size={14}/>, color:'#22C55E' },
              { label:'Nivel de entendimiento', val:'72%', icon:<TrendingUp size={14}/>, color:'#F59E0B' },
              { label:'Medallas obtenidas', val:'5', icon:<Trophy size={14}/>, color:'#8B5CF6' },
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
      <div className="sidebar-card medal-card">
        <div className="medal-icon-wrap" style={{ fontSize: '2rem' }}>🏅</div>
        <div className="medal-info">
          <div className="medal-name">Explorador Curioso</div>
          <div className="medal-sub">Última medalla obtenida</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/achievements')} aria-label="Última medalla: Explorador Curioso. Ir a la página de logros">Ver todas</button>
      </div>
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
          <div className="greeting-row" aria-label={`${getGreeting()}, ${userName}. Tienes 2 retos pendientes hoy.`}>
            <div>
              <h1 className="greeting-text">{getGreeting()}, {userName}!</h1>
              <p className="greeting-sub">Tienes 2 retos pendientes hoy</p>
            </div>
          </div>

          {/* Continue card */}
          {(() => {
            const continueEnrollment = enrollments[0]
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
            const continuePct = progressMap[continueCourse.id] || 0
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
              {CHALLENGES.map((c, i) => (
                <motion.div
                  key={i} className="challenge-card"
                  whileTap={{ scale:0.97 }}
                  onClick={() => {
                    if (i === 1) navigate('/coliseo')
                    else navigate(COURSE_QUIZ_MAP['1'] || '/roadmap/1')
                  }}
                  style={{ cursor:'pointer', '--course-color': c.color }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i === 1) navigate('/coliseo'); else navigate(COURSE_QUIZ_MAP['1'] || '/roadmap/1'); } }}
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
