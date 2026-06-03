import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Settings, Trophy, Home, Sparkles, Zap, Book, GraduationCap, Heart, Clock, AlertTriangle, TrendingUp, Users, PanelRightOpen } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { listNotifications } from '../lib/api'
import './Header.css'

const NOTIFICATIONS_BY_ROLE = {
  teacher: [
    { id: 1, title: '3 estudiantes sin actividad', desc: 'Biología Celular — 5+ días sin acceder al curso.', time: 'Hace 10 min', icon: <Clock size={16} />, color: '#EF4444' },
    { id: 2, title: 'Dificultad detectada', desc: '5 estudiantes con bajo rendimiento en "Anatomía Básica".', time: 'Hace 30 min', icon: <AlertTriangle size={16} />, color: '#F59E0B' },
    { id: 3, title: 'Nuevo estudiante inscrito', desc: 'María García se unió a "Biología Celular".', time: 'Hace 1 hora', icon: <Users size={16} />, color: '#22C55E' },
    { id: 4, title: 'Progreso destacado', desc: 'Carlos López completó el 100% de "Bioquímica General".', time: 'Hace 3 horas', icon: <TrendingUp size={16} />, color: '#6C63FF' },
  ],
  student: [
    { id: 1, title: '¡Nuevo curso asignado!', desc: 'Biología Celular II ya está disponible.', time: 'Hace 5 min', icon: <Book size={16} />, color: '#6C63FF' },
    { id: 2, title: 'Reto del día disponible', desc: 'Pon a prueba tus conocimientos en Mitocondria.', time: 'Hace 2 horas', icon: <Zap size={16} />, color: '#F59E0B' },
    { id: 3, title: 'Medalla desbloqueada', desc: '¡Has ganado "Explorador Curioso"!', time: 'Ayer', icon: <Sparkles size={16} />, color: '#22C55E' },
  ],
  parent: [
    { id: 1, title: 'Progreso semanal', desc: 'Tu hijo completó 3 lecciones esta semana.', time: 'Hace 15 min', icon: <TrendingUp size={16} />, color: '#22C55E' },
    { id: 2, title: 'Nueva medalla', desc: '¡Tu hijo ganó "Maestro de la Mitocondria"!', time: 'Hace 1 hora', icon: <Sparkles size={16} />, color: '#F59E0B' },
    { id: 3, title: 'Tiempo de estudio', desc: 'Tu hijo estudió 4.5 horas esta semana.', time: 'Hace 2 horas', icon: <Clock size={16} />, color: '#6C63FF' },
  ],
}

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [dropdown, setDropdown] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [dbNotifs, setDbNotifs] = useState([])
  const mobileNavRef = useRef(null)

  // Close mobile nav on click outside
  useEffect(() => {
    if (!mobileNavOpen) return
    const handleClick = (e) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target)) {
        setMobileNavOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileNavOpen])

  // Load notifications from DB when user changes
  useEffect(() => {
    if (!user?.id) {
      setDbNotifs([])
      return
    }
    let cancelled = false
    listNotifications(user.id).then(({ data }) => {
      if (!cancelled) setDbNotifs(data || [])
    })
    return () => { cancelled = true }
  }, [user?.id])

  const notifications =
    dbNotifs.length > 0
      ? dbNotifs.map((n) => ({
          id: n.id,
          title: n.payload?.title || n.type,
          desc: n.payload?.desc || (n.payload?.student_name ? `Estudiante: ${n.payload.student_name}` : ''),
          time: new Date(n.created_at).toLocaleString('es-ES'),
          icon: <Bell size={16} />,
          color: '#6C63FF',
        }))
      : NOTIFICATIONS_BY_ROLE[user?.role || 'student'] || NOTIFICATIONS_BY_ROLE.student

  const userData = user || { name: 'Usuario', avatar: '🦊', role: 'student' }

  const roleIcon = {
    teacher: <GraduationCap size={14} />,
    student: <User size={14} />,
    parent: <Heart size={14} />,
  }

  const roleLabels = {
    teacher: 'Docente',
    student: 'Estudiante',
    parent: 'Padre',
  }

  const homeRoute = {
    teacher: '/teacher',
    student: '/dashboard',
    parent: '/parent',
  }

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo + mobile nav toggle */}
        <div className="header-logo" onClick={() => navigate(homeRoute[userData.role] || '/dashboard')}>
          <div className="logo-icon">✦</div>
          <span className="logo-text">EduApp</span>
          {userData.role === 'student' && (
            <div className="mobile-nav-wrapper hide-desktop" ref={mobileNavRef}>
              <button
                className={`mobile-nav-arrow-btn ${mobileNavOpen ? 'open' : ''}`}
                onClick={(e) => { e.stopPropagation(); setMobileNavOpen(!mobileNavOpen); setShowNotifs(false); setDropdown(false) }}
                aria-label="Menú de navegación"
              >
                <ChevronDown size={16} />
              </button>
              {mobileNavOpen && (
                <div className="mobile-nav-dropdown animate-fadeInUp">
                  <MobileNavLink to="/dashboard" icon={<Home size={16}/>} label="Inicio" current={location.pathname} onClose={() => setMobileNavOpen(false)} />
                  <MobileNavLink to="/achievements" icon={<Trophy size={16}/>} label="Logros" current={location.pathname} onClose={() => setMobileNavOpen(false)} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav (desktop) - role specific */}
        <nav className="header-nav hide-mobile">
          {userData.role === 'student' && (
            <>
              <NavLink to="/dashboard" icon={<Home size={16}/>} label="Inicio" current={location.pathname} />
              <NavLink to="/achievements" icon={<Trophy size={16}/>} label="Logros" current={location.pathname} />
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="header-right">
          {onToggleSidebar && (
            <button
              className="icon-btn sidebar-toggle-btn"
              onClick={onToggleSidebar}
              aria-label="Abrir panel lateral"
            >
              <PanelRightOpen size={18} />
            </button>
          )}
          <div className="notif-wrapper">
            <button 
              className={`icon-btn notif-btn ${showNotifs ? 'active' : ''}`} 
              aria-label="Notificaciones"
              onClick={() => { setShowNotifs(!showNotifs); setDropdown(false) }}
            >
              <Bell size={18} />
              <span className="notif-badge">{notifications.length}</span>
            </button>
            {showNotifs && (
              <div className="notif-dropdown animate-fadeInUp">
                <div className="notif-header">
                  <h3>Notificaciones</h3>
                  <button className="btn btn-ghost btn-sm">Marcar todo como leído</button>
                </div>
                <div className="notif-list">
                  {notifications.map(n => (
                    <div key={n.id} className="notif-item">
                      <div className="notif-icon" style={{ background: `${n.color}18`, color: n.color }}>
                        {n.icon}
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-desc">{n.desc}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="avatar-dropdown" onClick={() => { setDropdown(!dropdown); setShowNotifs(false) }}>
            <div className="user-avatar">{userData.avatar}</div>
            <span className="user-name hide-mobile">{userData.name.split(' ')[0]}</span>
            <ChevronDown size={14} className={`chevron ${dropdown ? 'open' : ''}`} />
            {dropdown && (
              <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                <div className="dropdown-header">
                  <div className="user-avatar lg">{userData.avatar}</div>
                  <div>
                    <div className="dropdown-name">{userData.name}</div>
                    <div className="dropdown-role">
                      {roleIcon[userData.role]}
                      {roleLabels[userData.role]}
                    </div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { navigate('/profile'); setDropdown(false) }}>
                  <User size={15}/> Mi Perfil
                </button>
                <button className="dropdown-item" onClick={() => { navigate('/settings'); setDropdown(false) }}>
                  <Settings size={15}/> Configuración
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={async () => { try { await logout() } catch { /* ignore */ } navigate('/login'); setDropdown(false) }}>
                  <LogOut size={15}/> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function NavLink({ to, icon, label, current }) {
  const navigate = useNavigate()
  const active = current === to
  return (
    <button
      className={`nav-link ${active ? 'active' : ''}`}
      onClick={() => navigate(to)}
    >
      {icon} {label}
    </button>
  )
}

function MobileNavLink({ to, icon, label, current, onClose }) {
  const navigate = useNavigate()
  const active = current === to
  return (
    <button
      className={`mobile-nav-link ${active ? 'active' : ''}`}
      onClick={(e) => { e.stopPropagation(); navigate(to); onClose() }}
    >
      <span className="mobile-nav-link-icon" style={{ color: active ? 'var(--primary-light)' : 'var(--text-muted)' }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
