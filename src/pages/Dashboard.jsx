import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Zap, Trophy, Clock, TrendingUp, Beaker, Layout, Globe, Code, X, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { getStudentEnrollments, listStudentMedals, isSupabaseConfigured } from '../lib/api'
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
      setEnrollments((enr || []).map((e) => ({
        enrollmentId: e.id,
        course: e.courses,
      })).filter((e) => e.course))
      setMedals(meds || [])
      setLoadingData(false)
    }
    load()
    return () => { cancelled = true }
  }, [studentId])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const sidebarContent = (
    <>
      {/* Mascot panel */}
      <div className="sidebar-card">
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

      {/* Stats */}
      <div className="sidebar-card">
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

      {/* Last medal */}
      <div className="sidebar-card medal-card">
        <div className="medal-icon-wrap" style={{ fontSize: '2rem' }}>{medals[0]?.svg_url ? <img src={medals[0].svg_url} alt={medals[0].name} style={{ width: '100%' }} /> : '🏅'}</div>
        <div className="medal-info">
          <div className="medal-name">{medals[0]?.name || 'Sin medallas aún'}</div>
          <div className="medal-sub">{medals[0] ? `Última medalla (${medals[0].rarity})` : 'Completa retos para ganar tu primera'}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/achievements')}>Ver todas</button>
      </div>
    </>
  )

  return (
    <PageWrapper>
      <Header onToggleSidebar={() => setSidebarOpen(true)} />
      <div className="dashboard-layout">
        {/* Main content */}
        <main className="dashboard-main">
          {/* Greeting */}
          <div className="greeting-row">
            <div>
              <h1 className="greeting-text">{getGreeting()}, {userName}!</h1>
              <p className="greeting-sub">Tienes 2 retos pendientes hoy</p>
            </div>
          </div>

          {/* Continue card */}
          {(() => {
            const continueCourse = enrollments[0]?.course
            if (!continueCourse) {
              return (
                <motion.div
                  className="continue-card"
                  onClick={() => navigate('/explore')}
                  style={{ cursor:'pointer', '--course-color': '#6C63FF' }}
                >
                  <div className="continue-content">
                    <div className="continue-badge badge badge-purple">Explorar</div>
                    <h2 className="continue-title">No tienes cursos aún</h2>
                    <p className="continue-node">Explora el catálogo e inscríbete en un curso con un código de invitación.</p>
                    <button
                      className="btn btn-primary"
                      style={{width:'fit-content', marginTop:16}}
                      onClick={(e) => { e.stopPropagation(); navigate('/explore') }}
                    >
                      Ver catálogo
                    </button>
                  </div>
                  <div className="continue-art"><BookOpen size={80}/></div>
                </motion.div>
              )
            }
            return (
              <motion.div
                className="continue-card"
                onClick={() => navigate(`/roadmap/${continueCourse.id}`)}
                style={{ cursor:'pointer', '--course-color': ICON_POOL[0].color }}
              >
                <div className="continue-content">
                  <div className="continue-badge badge badge-green">Continuar</div>
                  <h2 className="continue-title">{continueCourse.title}</h2>
                  <p className="continue-node">{continueCourse.profiles?.full_name ? `Prof. ${continueCourse.profiles.full_name}` : 'Continúa donde quedaste'}</p>
                  <div className="continue-progress">
                    <div className="progress-bar" style={{flex:1}}>
                      <div className="progress-fill" style={{width:'35%', background:'linear-gradient(90deg,#22C55E,#4ADE80)'}}/>
                    </div>
                    <span className="continue-pct">—</span>
                  </div>
                  <button
                    className="btn btn-success"
                    style={{width:'fit-content', marginTop:16}}
                    onClick={(e) => { e.stopPropagation(); navigate(`/roadmap/${continueCourse.id}`) }}
                  >
                    ▶ Continuar sesión
                  </button>
                </div>
                <div className="continue-art"><Beaker size={80}/></div>
              </motion.div>
            )
          })()}

          {/* Challenges */}
          <section>
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
          <section>
            <div className="section-header">
              <h2 className="section-title">Mis Cursos</h2>
            </div>
            {enrollments.length === 0 ? (
              <div className="empty-state card" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Aún no estás inscrito en ningún curso. Visita <a href="#/explore" onClick={(e) => { e.preventDefault(); navigate('/explore') }}>Explorar</a> para inscribirte con un código.</p>
              </div>
            ) : (
              <div className="courses-grid">
                {enrollments.map((e, i) => {
                  const c = e.course
                  const visual = ICON_POOL[i % ICON_POOL.length]
                  return (
                    <motion.div
                      key={e.enrollmentId}
                      className="course-card"
                      initial={{ opacity:0, y:20 }}
                      animate={{ opacity:1, y:0, transition:{ delay: i*0.08 } }}
                      onClick={() => navigate(`/roadmap/${c.id}`)}
                      style={{ cursor:'pointer', '--course-color': visual.color }}
                    >
                      <div className="course-cover" style={{ background:`linear-gradient(135deg,${visual.color}44,${visual.color}11)` }}>
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
                            <div className="progress-fill" style={{width:'0%', background:`linear-gradient(90deg,${visual.color},${visual.color}aa)`}}/>
                          </div>
                          <span className="course-pct" style={{color:visual.color}}>0%</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>
        </main>

        {/* Sidebar — desktop */}
        <aside className="dashboard-sidebar hide-tablet">
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
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              key="sidebar-drawer"
              className="dashboard-sidebar mobile-drawer"
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
