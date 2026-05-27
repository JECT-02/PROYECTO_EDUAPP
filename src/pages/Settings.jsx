import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Moon, Volume2, Eye, Type, Move, Mic, Glasses } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'

const ACCESSIBILITY_OPTIONS = [
  { key:'contrast', label:'Modo de alto contraste', desc:'Máximo contraste en colores', icon:<Eye size={20}/> },
  { key:'narration', label:'Narración por voz', desc:'El sistema lee el contenido en voz alta', icon:<Volume2 size={20}/> },
  { key:'reduced', label:'Reducir animaciones', desc:'Fades simples en lugar de efectos complejos', icon:<Move size={20}/> },
  { key:'voice', label:'Navegación por voz', desc:'Controla la app con comandos de voz', icon:<Mic size={20}/> },
  { key:'largeText', label:'Texto grande', desc:'Aumenta el tamaño de letra base', icon:<Type size={20}/> },
  { key:'colorblind', label:'Modo para daltónismo', desc:'Paletas de color accesibles', icon:<Glasses size={20}/> },
]

export default function Settings() {
  const navigate = useNavigate()

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
    if (key === 'narration' && !prefs[key] && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('Narración activada. ¡Hola! Estoy aquí para ayudarte.')
      u.lang = 'es-ES'; u.rate = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  return (
    <PageWrapper style={{ padding: '48px 40px', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Configuración</h1>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Preferencias */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Preferencias
            </h2>
          </div>
          <SettingRow icon={<Bell size={18}/>} label="Notificaciones" active={!!prefs.notifications} onToggle={() => toggle('notifications')} />
          <SettingRow icon={<Volume2 size={18}/>} label="Efectos de sonido" active={!!prefs.sound} onToggle={() => toggle('sound')} />
          <SettingRow icon={<Moon size={18}/>} label="Modo oscuro" active={!!prefs.darkMode} onToggle={() => toggle('darkMode')} last />
        </div>

        {/* Accesibilidad — mismas opciones que el onboarding */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Accesibilidad
            </h2>
          </div>
          {ACCESSIBILITY_OPTIONS.map((opt, i) => (
            <SettingRow
              key={opt.key}
              icon={opt.icon}
              label={opt.label}
              desc={opt.desc}
              active={!!prefs[opt.key]}
              onToggle={() => toggle(opt.key)}
              last={i === ACCESSIBILITY_OPTIONS.length - 1}
            />
          ))}
        </div>


      </div>
    </PageWrapper>
  )
}

function SettingRow({ icon, label, desc, active, onToggle, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
      transition: 'background 0.2s'
    }}>
      <div style={{ color: 'var(--primary-light)', display: 'flex', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500, fontSize: '0.95rem', display: 'block' }}>{label}</span>
        {desc && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>{desc}</span>}
      </div>
      <label className="toggle-switch" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={active} onChange={onToggle} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
