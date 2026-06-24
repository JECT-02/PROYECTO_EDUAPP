import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Settings, Trophy, Home, Sparkles, Zap, Book, GraduationCap, Heart, Clock, AlertTriangle, TrendingUp, Users, PanelRightOpen } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { listNotifications } from '../lib/api'
import { markAsRead, markAllAsRead } from '../lib/notifications'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Header.css'

const ICON_MAP = {
  medal: <Sparkles size={16} />,
  progress: <TrendingUp size={16} />,
  quiz_result: <Book size={16} />,
  enrollment: <Book size={16} />,
  new_student: <Users size={16} />,
  student_progress: <TrendingUp size={16} />,
  inactivity_alert: <Clock size={16} />,
  child_progress: <TrendingUp size={16} />,
  child_medal: <Sparkles size={16} />,
  parent_request: <Users size={16} />,
  coliseo_result: <Zap size={16} />,
}

const COLOR_MAP = {
  medal: '#22C55E',
  progress: '#22C55E',
  quiz_result: '#6C63FF',
  enrollment: '#6C63FF',
  new_student: '#22C55E',
  student_progress: '#6C63FF',
  inactivity_alert: '#EF4444',
  child_progress: '#22C55E',
  child_medal: '#F59E0B',
  parent_request: '#6C63FF',
  coliseo_result: '#F59E0B',
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
  const notifFirstFocusableRef = useRef(null)

  const prefsEnabled = useCallback(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('eduapp_prefs') || '{}')
      return prefs.notifications !== false
    } catch { return true }
  }, [])

  const loadNotifications = useCallback(async () => {
    if (!user?.id || !prefsEnabled()) {
      setDbNotifs([])
      return
    }
    const { data } = await listNotifications(user.id)
    setDbNotifs(data || [])
  }, [user?.id, prefsEnabled])

  useEffect(() => {
    if (!user?.id) {
      setDbNotifs([])
      return
    }
    loadNotifications()
  }, [user?.id, loadNotifications])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return

    const channel = supabase
      .channel(`notifs-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { loadNotifications() }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { loadNotifications() }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { loadNotifications() }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[notifications] realtime channel error, recargando')
          loadNotifications()
        }
      })

    const handlePrefsChange = (e) => {
      if (e.detail?.key === 'notifications') loadNotifications()
    }
    window.addEventListener('eduapp-prefs-changed', handlePrefsChange)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('eduapp-prefs-changed', handlePrefsChange)
    }
  }, [user?.id, loadNotifications])

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

  // Focus notification dialog when it opens — makes NVDA read its content
  useEffect(() => {
    if (showNotifs && notifFirstFocusableRef.current) {
      // Small delay for animation to start
      requestAnimationFrame(() => {
        notifFirstFocusableRef.current?.focus()
      })
    }
  }, [showNotifs])

  const notifications =
    dbNotifs.length > 0
      ? dbNotifs.map((n) => ({
          id: n.id,
          read: n.read,
          title: n.payload?.title || n.type,
          desc: n.payload?.desc || '',
          time: formatTimeAgo(n.created_at),
          icon: ICON_MAP[n.type] || <Bell size={16} />,
          color: COLOR_MAP[n.type] || '#6C63FF',
        }))
      : null

  const notifDisplay = notifications || getFallbackNotifs(user?.role)

  const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0

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
    <header className="app-header" role="banner" aria-label="Encabezado de navegación">
      <div className="header-inner">
        {/* Logo + mobile nav toggle */}
        <div className="header-logo" onClick={() => navigate(homeRoute[userData.role] || '/dashboard')} aria-label="Ir al inicio">
          <div className="logo-icon" aria-hidden="true">✦</div>
          <span className="logo-text">EduApp</span>
          {userData.role === 'student' && (
            <div className="mobile-nav-wrapper hide-desktop" ref={mobileNavRef}>
              <button
                className={`mobile-nav-arrow-btn ${mobileNavOpen ? 'open' : ''}`}
                onClick={(e) => { e.stopPropagation(); setMobileNavOpen(!mobileNavOpen); setShowNotifs(false); setDropdown(false) }}
                aria-label="Menú de navegación móvil"
                aria-expanded={mobileNavOpen}
              >
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {mobileNavOpen && (
                <div className="mobile-nav-dropdown animate-fadeInUp" role="menu" aria-label="Navegación rápida">
                  <MobileNavLink to="/dashboard" icon={<Home size={16}/>} label="Inicio" current={location.pathname} onClose={() => setMobileNavOpen(false)} />
                  <MobileNavLink to="/achievements" icon={<Trophy size={16}/>} label="Logros" current={location.pathname} onClose={() => setMobileNavOpen(false)} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav (desktop) - role specific */}
        <nav className="header-nav hide-mobile" aria-label="Navegación principal">
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
              aria-label={`Notificaciones: ${unreadCount} sin leer`}
              aria-expanded={showNotifs}
              onClick={() => { setShowNotifs(!showNotifs); setDropdown(false) }}
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && <span className="notif-badge" aria-hidden="true">{unreadCount}</span>}
            </button>
            {showNotifs && (
              <div
                className="notif-dropdown animate-fadeInUp"
                role="region"
                aria-label="Panel de notificaciones"
              >
                <div className="notif-header">
                  <h3 id="notif-heading">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        await markAllAsRead(user.id)
                        await loadNotifications()
                      }}
                    >
                      Marcar todas leídas
                    </button>
                  )}
                </div>
                <div className="notif-list" role="list" aria-label="Lista de notificaciones" tabIndex="-1" ref={notifFirstFocusableRef}>
                  {notifDisplay.map(n => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.read ? 'notif-unread' : ''}`}
                      role="listitem"
                      onClick={async () => {
                        if (n.read) return
                        await markAsRead(n.id)
                        await loadNotifications()
                      }}
                    >
                      <div className="notif-icon" style={{ background: `${n.color}18`, color: n.color }} aria-hidden="true">
                        {n.icon}
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-desc">{n.desc}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                      {!n.read && <div className="notif-dot" style={{ background: n.color }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="avatar-dropdown" onClick={() => { setDropdown(!dropdown); setShowNotifs(false) }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDropdown(!dropdown); setShowNotifs(false); } }} aria-label="Menú de usuario" aria-expanded={dropdown}>
            <div className="user-avatar" aria-hidden="true">{userData.avatar}</div>
            <span className="user-name hide-mobile">{userData.name.split(' ')[0]}</span>
            <ChevronDown size={14} className={`chevron ${dropdown ? 'open' : ''}`} aria-hidden="true" />
            {dropdown && (
              <div className="dropdown-menu" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} role="menu" aria-label="Opciones de usuario">
                <div className="dropdown-header" role="presentation">
                  <div className="user-avatar lg" aria-hidden="true">{userData.avatar}</div>
                  <div>
                    <div className="dropdown-name">{userData.name}</div>
                    <div className="dropdown-role">
                      {roleIcon[userData.role]}
                      {roleLabels[userData.role]}
                    </div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" role="menuitem" onClick={() => { navigate('/profile'); setDropdown(false) }}>
                  <User size={15} aria-hidden="true"/> Mi Perfil
                </button>
                <button className="dropdown-item" role="menuitem" onClick={() => { navigate('/settings'); setDropdown(false) }}>
                  <Settings size={15} aria-hidden="true"/> Configuración
                </button>
                <div className="dropdown-divider" role="separator" />
                <button className="dropdown-item danger" role="menuitem" onClick={async () => { try { await logout() } catch { /* ignore */ } navigate('/login'); setDropdown(false) }}>
                  <LogOut size={15} aria-hidden="true"/> Cerrar sesión
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

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-ES')
}

function getFallbackNotifs(role) {
  if (role === 'teacher') return [
    { id: 'fb-1', read: true, title: 'Panel de notificaciones', desc: 'Las notificaciones reales aparecerán aquí cuando haya actividad.', time: '', icon: <Bell size={16} />, color: '#6C63FF' },
  ]
  if (role === 'parent') return [
    { id: 'fb-1', read: true, title: 'Panel de notificaciones', desc: 'Las notificaciones sobre tu hijo aparecerán aquí.', time: '', icon: <Bell size={16} />, color: '#6C63FF' },
  ]
  return [
    { id: 'fb-1', read: true, title: 'Sin notificaciones', desc: 'Completa lecciones y quizzes para recibir notificaciones.', time: '', icon: <Sparkles size={16} />, color: '#6C63FF' },
  ]
}
