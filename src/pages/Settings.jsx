import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Moon, Volume2, Eye, Type, Move, Mic, Glasses } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import './Settings.css'

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
    const nextVal = !prefs[key]
    setPrefs(p => {
      const next = { ...p, [key]: nextVal }
      localStorage.setItem('eduapp_prefs', JSON.stringify(next))
      return next
    })
    // Apply/remove high contrast class on body
    if (key === 'contrast') {
      document.body.classList.toggle('high-contrast', nextVal)
    }
    if (key === 'reduced') {
      document.body.classList.toggle('reduce-motion', nextVal)
    }
    if (key === 'colorblind') {
      document.body.classList.toggle('colorblind', nextVal)
    }
    if (key === 'largeText') {
      document.body.classList.toggle('large-text', nextVal)
      document.documentElement.style.fontSize = nextVal ? '18px' : ''
    }
    if (key === 'narration' && nextVal && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('Narración activada. ¡Hola! Estoy aquí para ayudarte.')
      u.lang = 'es-ES'; u.rate = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  return (
    <PageWrapper className="settings-page">
      {/* Header */}
      <header className="settings-header">
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 className="settings-title">Configuración</h1>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Preferencias */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">
              Preferencias
            </h2>
          </div>
          <SettingRow icon={<Bell size={18}/>} label="Notificaciones" active={!!prefs.notifications} onToggle={() => toggle('notifications')} />
          <SettingRow icon={<Volume2 size={18}/>} label="Efectos de sonido" active={!!prefs.sound} onToggle={() => toggle('sound')} />
          <SettingRow icon={<Moon size={18}/>} label="Modo oscuro" active={!!prefs.darkMode} onToggle={() => toggle('darkMode')} />
        </div>

        {/* Accesibilidad — mismas opciones que el onboarding */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">
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
            />
          ))}
        </div>


      </div>
    </PageWrapper>
  )
}

function SettingRow({ icon, label, desc, active, onToggle }) {
  return (
    <div className="setting-row">
      <div className="setting-icon">{icon}</div>
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {desc && <span className="setting-desc">{desc}</span>}
      </div>
      <label className="toggle-switch" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={active} onChange={onToggle} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
