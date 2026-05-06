import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import './Onboarding.css'

const OPTIONS = [
  { key:'contrast', label:'Modo de alto contraste', desc:'Máximo contraste en colores', icon:'🌗' },
  { key:'narration', label:'Narración por voz', desc:'El sistema lee el contenido en voz alta', icon:'🔊' },
  { key:'reduced', label:'Reducir animaciones', desc:'Fades simples en lugar de efectos complejos', icon:'🎭' },
  { key:'voice', label:'Navegación por voz', desc:'Controla la app con comandos de voz', icon:'🎤' },
  { key:'largeText', label:'Texto grande', desc:'Aumenta el tamaño de letra base', icon:'🔡' },
  { key:'colorblind', label:'Modo para daltónismo', desc:'Paletas de color accesibles (viridis)', icon:'👁️' },
]

export default function OnboardingAccess() {
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState({})

  function toggle(key) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
    if (key === 'narration' && !prefs[key] && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('Narración activada. ¡Hola! Estoy aquí para ayudarte.')
      u.lang = 'es-ES'; u.rate = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  return (
    <PageWrapper>
      <div className="onboarding-page">
        <div className="onboarding-wrap">
          {/* Header */}
          <div className="onboarding-header">
            <div className="onb-logo">✦ EduApp</div>
            <div className="onb-step-badge">Paso 1 de 2</div>
          </div>

          <div className="onb-hero">
            <div className="onb-icon">♿</div>
            <h1>Personaliza tu experiencia</h1>
            <p>Activa las opciones que mejor se adapten a ti. Puedes cambiarlas cuando quieras.</p>
          </div>

          <div className="access-grid">
            {OPTIONS.map(o => (
              <div
                key={o.key}
                className={`access-card card ${prefs[o.key] ? 'enabled' : ''}`}
                onClick={() => toggle(o.key)}
              >
                <div className="access-icon">{o.icon}</div>
                <div className="access-info">
                  <div className="access-label">{o.label}</div>
                  <div className="access-desc">{o.desc}</div>
                </div>
                <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={!!prefs[o.key]} onChange={() => toggle(o.key)}/>
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>

          <div className="onb-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/onboarding/avatar')}>
              Omitir por ahora
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/onboarding/avatar')}>
              Continuar →
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
