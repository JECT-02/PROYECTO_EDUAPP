import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Zap, Trophy, Clock, TrendingUp, Beaker, Layout, Globe, Code } from 'lucide-react'
import Header from '../components/Header'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Dashboard.css'

const COURSES = [
  { id:1, title:'Biología Celular', teacher:'Prof. Ramírez', progress:65, color:'#22C55E', icon:<Beaker size={32}/>, status:'En progreso', nodes:12, completedNodes:8 },
  { id:2, title:'Matemáticas Avanzadas', teacher:'Prof. Torres', progress:30, color:'#6C63FF', icon:<Layout size={32}/>, status:'En progreso', nodes:10, completedNodes:3 },
  { id:3, title:'Historia del Mundo', teacher:'Prof. Vega', progress:90, color:'#F59E0B', icon:<Globe size={32}/>, status:'Completado', nodes:8, completedNodes:7 },
  { id:4, title:'Programación Python', teacher:'Prof. Cruz', progress:0, color:'#3B82F6', icon:<Code size={32}/>, status:'Nuevo', nodes:15, completedNodes:0 },
]

const CHALLENGES = [
  { title:'Repaso: División Celular', time:'~8 min', icon:<Beaker size={20}/>, color:'#22C55E', course:'Biología Celular' },
  { title:'Coliseo desbloqueado — Historia', icon:<Trophy size={20}/>, color:'#F59E0B', time:'30 min', course:'Historia del Mundo' },
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

  return (
    <PageWrapper>
      <Header />
      <div className="dashboard-layout">
        {/* Main content */}
        <main className="dashboard-main">
          {/* Greeting */}
          <div className="greeting-row">
            <div>
              <h1 className="greeting-text">{getGreeting()}, Sofía</h1>
              <p className="greeting-sub">Tienes 2 retos pendientes hoy</p>
            </div>
          </div>

          {/* Continue card */}
          <motion.div
            className="continue-card card"
            whileHover={{ y:-3, boxShadow:'0 8px 32px rgba(108,99,255,0.25)' }}
            onClick={() => navigate('/roadmap')}
            style={{ cursor:'pointer' }}
          >
            <div className="continue-content">
              <div className="continue-badge badge badge-green">Continuar</div>
              <h2 className="continue-title">Biología Celular</h2>
              <p className="continue-node">📍 Nodo 9: La Mitocondria y sus funciones</p>
              <div className="continue-progress">
                <div className="progress-bar" style={{flex:1}}>
                  <div className="progress-fill" style={{width:'65%', background:'linear-gradient(90deg,#22C55E,#4ADE80)'}}/>
                </div>
                <span className="continue-pct">65%</span>
              </div>
              <button className="btn btn-success" style={{width:'fit-content', marginTop:16}}>
                ▶ Continuar sesión
              </button>
            </div>
            <div className="continue-art"><Beaker size={80}/></div>
          </motion.div>

          {/* Challenges */}
          <section>
            <h2 className="section-title">Retos del día</h2>
            <div className="challenges-row">
              {CHALLENGES.map((c, i) => (
                <motion.div
                  key={i} className="challenge-card card card-hover"
                  whileTap={{ scale:0.97 }}
                  onClick={() => navigate(i===1 ? '/coliseo' : '/quiz')}
                  style={{ cursor:'pointer', borderColor:`${c.color}44` }}
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
            <div className="courses-grid">
              {COURSES.map((c, i) => (
                <motion.div
                  key={c.id}
                  className="course-card card"
                  initial={{ opacity:0, y:20 }}
                  animate={{ opacity:1, y:0, transition:{ delay: i*0.08 } }}
                  whileHover={{ y:-4, boxShadow:`0 8px 32px ${c.color}22` }}
                  onClick={() => navigate(`/roadmap/${c.id}`)}
                  style={{ cursor:'pointer' }}
                >
                  <div className="course-cover" style={{ background:`linear-gradient(135deg,${c.color}44,${c.color}11)` }}>
                    <div style={{ color: c.color }}>{c.icon}</div>
                  </div>
                  <div className="course-body">
                    <div className="course-header-row">
                      <span className={`badge ${statusColor(c.status)}`}>{c.status}</span>
                      <span className="course-nodes">{c.completedNodes}/{c.nodes} nodos</span>
                    </div>
                    <h3 className="course-title">{c.title}</h3>
                    <p className="course-teacher">{c.teacher}</p>
                    <div className="course-progress-row">
                      <div className="progress-bar" style={{flex:1}}>
                        <div className="progress-fill" style={{width:`${c.progress}%`, background:`linear-gradient(90deg,${c.color},${c.color}aa)`}}/>
                      </div>
                      <span className="course-pct" style={{color:c.color}}>{c.progress}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </main>

        {/* Sidebar */}
        <aside className="dashboard-sidebar hide-mobile">
          {/* Mascot panel */}
          <div className="sidebar-card card">
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
              <p className="xp-hint">680 XP para nivel 3 🔥</p>
            </div>
          </div>

          {/* Stats */}
          <div className="sidebar-card card">
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
          <div className="sidebar-card card medal-card">
            <div className="medal-icon-wrap" style={{ fontSize: '2rem' }}>🏅</div>
            <div className="medal-info">
              <div className="medal-name">Explorador Curioso</div>
              <div className="medal-sub">Última medalla obtenida</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/achievements')}>Ver todas</button>
          </div>
        </aside>
      </div>
    </PageWrapper>
  )
}
