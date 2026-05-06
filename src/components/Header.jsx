import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Search, ChevronDown, LogOut, User, Settings, BookOpen, Trophy, Home } from 'lucide-react'
import { useState } from 'react'
import './Header.css'

export default function Header({ user = { name: 'Sofía García', avatar: '🦊' } }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdown, setDropdown] = useState(false)

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
          <NavLink to="/explore" icon={<BookOpen size={16}/>} label="Explorar" current={location.pathname} />
          <NavLink to="/achievements" icon={<Trophy size={16}/>} label="Logros" current={location.pathname} />
        </nav>

        {/* Right side */}
        <div className="header-right">
          <button className="icon-btn hide-mobile" aria-label="Buscar">
            <Search size={18} />
          </button>
          <button className="icon-btn notif-btn" aria-label="Notificaciones">
            <Bell size={18} />
            <span className="notif-badge">3</span>
          </button>
          <div className="avatar-dropdown" onClick={() => setDropdown(!dropdown)}>
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
