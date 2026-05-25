import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Moon, Volume2, Eye, Type, Move } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('eduapp_prefs')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  const toggle = (key) => {
    setPrefs(p => {
      const next = { ...p, [key]: !p[key] }
      localStorage.setItem('eduapp_prefs', JSON.stringify(next))
      return next
    })
  }

  return (
    <PageWrapper style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Configuración</h1>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Preferencias */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Preferencias
            </h2>
          </div>
          <SettingRow icon={<Bell size={18}/>} label="Notificaciones de retos" active={!!prefs.notifications} onToggle={() => toggle('notifications')} />
          <SettingRow icon={<Volume2 size={18}/>} label="Efectos de sonido" active={!!prefs.sound} onToggle={() => toggle('sound')} />
          <SettingRow icon={<Moon size={18}/>} label="Modo oscuro" active={!!prefs.darkMode} onToggle={() => toggle('darkMode')} last />
        </div>

        {/* Accesibilidad */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Accesibilidad
            </h2>
          </div>
          <SettingRow icon={<Eye size={18}/>} label="Alto contraste" active={!!prefs.contrast} onToggle={() => toggle('contrast')} />
          <SettingRow icon={<Type size={18}/>} label="Texto grande" active={!!prefs.largeText} onToggle={() => toggle('largeText')} />
          <SettingRow icon={<Move size={18}/>} label="Reducir animaciones" active={!!prefs.reduced} onToggle={() => toggle('reduced')} last />
        </div>

        {/* Info de cuenta */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '1.5rem' }}>{user?.avatar || '🦊'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.name || 'Usuario'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function SettingRow({ icon, label, active, onToggle, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
      transition: 'background 0.2s'
    }}>
      <div style={{ color: 'var(--primary-light)', display: 'flex' }}>{icon}</div>
      <span style={{ flex: 1, fontWeight: 500, fontSize: '0.95rem' }}>{label}</span>
      <label className="toggle-switch" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={active} onChange={onToggle} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
