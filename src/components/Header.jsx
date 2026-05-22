import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Settings, Trophy, Home, Sparkles, Zap, Book } from 'lucide-react'
import { useState } from 'react'
import './Header.css'

const NOTIFICATIONS = [
  { id: 1, title: '¡Nuevo curso asignado!', desc: 'Biología Celular II ya está disponible.', time: 'Hace 5 min', icon: <Book size={16} />, color: '#6C63FF' },
  { id: 2, title: 'Reto del día disponible', desc: 'Pon a prueba tus conocimientos en Mitocondria.', time: 'Hace 2 horas', icon: <Zap size={16} />, color: '#F59E0B' },
  { id: 3, title: 'Medalla desbloqueada', desc: '¡Has ganado "Explorador Curioso"!', time: 'Ayer', icon: <Sparkles size={16} />, color: '#22C55E' },
]

export default function Header({ user = { name: 'Sofía García', avatar: '🦊' } }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdown, setDropdown] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo */}
        <div className="header-logo" onClick={() => navigate('/dashboard')}>
          <div className="logo-icon">✦</div>
          <span className="logo-text">EduApp</span>
        </div>

        {/* Nav (desktop) */}
        <nav className="header-nav hide-mobile">
          <NavLink to="/dashboard" icon={<Home size={16}/>} label="Inicio" current={location.pathname} />
          <NavLink to="/achievements" icon={<Trophy size={16}/>} label="Logros" current={location.pathname} />
        </nav>

        {/* Right side */}
        <div className="header-right">
          <div className="notif-wrapper">
            <button 
              className={`icon-btn notif-btn ${showNotifs ? 'active' : ''}`} 
              aria-label="Notificaciones"
              onClick={() => { setShowNotifs(!showNotifs); setDropdown(false) }}
            >
              <Bell size={18} />
              <span className="notif-badge">3</span>
            </button>
            {showNotifs && (
              <div className="notif-dropdown card animate-fadeInUp">
                <div className="notif-header">
                  <h3>Notificaciones</h3>
                  <button className="btn btn-ghost btn-sm">Marcar todo como leído</button>
                </div>
                <div className="notif-list">
                  {NOTIFICATIONS.map(n => (
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
            <div className="user-avatar">{user.avatar}</div>
            <span className="user-name hide-mobile">{user.name.split(' ')[0]}</span>
            <ChevronDown size={14} className={`chevron ${dropdown ? 'open' : ''}`} />
            {dropdown && (
              <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                <div className="dropdown-header">
                  <div className="user-avatar lg">{user.avatar}</div>
                  <div>
                    <div className="dropdown-name">{user.name}</div>
                    <div className="dropdown-role">Estudiante</div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { navigate('/profile'); setDropdown(false) }}>
                  <User size={15}/> Mi Perfil
                </button>
                <button className="dropdown-item" onClick={() => { navigate('/profile'); setDropdown(false) }}>
                  <Settings size={15}/> Configuración
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={() => { navigate('/login'); setDropdown(false) }}>
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
