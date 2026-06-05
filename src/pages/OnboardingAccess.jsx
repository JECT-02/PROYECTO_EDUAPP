import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Move, Mic, Type, Glasses, Sparkles, Check } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import './Onboarding.css'

const OPTIONS = [
  { key:'contrast', label:'Modo de alto contraste', desc:'Máximo contraste en colores', icon:<Eye size={24}/> },
  { key:'reduced', label:'Reducir animaciones', desc:'Fades simples en lugar de efectos complejos', icon:<Move size={24}/> },
  { key:'voice', label:'Navegación por voz', desc:'Controla la app con comandos de voz', icon:<Mic size={24}/> },
  { key:'largeText', label:'Texto grande', desc:'Aumenta el tamaño de letra base', icon:<Type size={24}/> },
  { key:'colorblind', label:'Modo para daltónismo', desc:'Paletas de color accesibles', icon:<Glasses size={24}/> },
]

export default function OnboardingAccess() {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('eduapp_prefs')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  function toggle(key) {
    const nextVal = !prefs[key]
    setPrefs(p => {
      const next = { ...p, [key]: nextVal }
      localStorage.setItem('eduapp_prefs', JSON.stringify(next))
      return next
    })
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
  }

  function handleContinue() {
    // Apply accessibility classes from localStorage (closure state may be stale if toggle was just called)
    try {
      const saved = JSON.parse(localStorage.getItem('eduapp_prefs') || '{}')
      if (saved.contrast) document.body.classList.add('high-contrast')
      if (saved.reduced) document.body.classList.add('reduce-motion')
      if (saved.colorblind) document.body.classList.add('colorblind')
      if (saved.largeText) {
        document.body.classList.add('large-text')
        document.documentElement.style.fontSize = '18px'
      }
      // Persist accessibility_settings to Supabase profile
      updateProfile({
        accessibility_settings: {
          contrast: !!saved.contrast,
          narration: !!saved.narration,
          reduced: !!saved.reduced,
          voice: !!saved.voice,
          large_text: !!saved.largeText,
          colorblind: !!saved.colorblind,
        },
      }).catch(() => { /* offline / sin auth -> no-op */ })
    } catch { /* ignore */ }
    navigate('/onboarding/avatar')
  }

  return (
    <PageWrapper>
      <div className="onboarding-page">
        <div className="onboarding-wrap">
          {/* Header */}
          <div className="onboarding-header" role="banner">
            <div className="onb-logo">✦ EduApp</div>
            <div className="onb-step-badge">Paso 1 de 2</div>
          </div>

          <div className="onb-hero">
            <h1>Personaliza tu experiencia</h1>
            <p>Activa las opciones que mejor se adapten a ti. Puedes cambiarlas cuando quieras.</p>
          </div>

          <div className="access-grid" role="group" aria-label="Opciones de accesibilidad">
            {OPTIONS.map(o => {
              const id = `onb-access-${o.key}`
              return (
                <div
                  key={o.key}
                  className={`access-card ${prefs[o.key] ? 'enabled' : ''}`}
                  onClick={() => toggle(o.key)}
                  role="checkbox"
                  aria-checked={!!prefs[o.key]}
                  aria-labelledby={id}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(o.key); } }}
                >
                  <div className="access-icon" aria-hidden="true">{o.icon}</div>
                  <div className="access-info">
                    <div className="access-label" id={id}>{o.label}</div>
                    <div className="access-desc">{o.desc}</div>
                  </div>
                  <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={!!prefs[o.key]} onChange={() => toggle(o.key)} aria-labelledby={id} />
                    <span className="toggle-slider" aria-hidden="true" />
                  </label>
                </div>
              )
            })}
          </div>

          <div className="onb-actions">
            <button className="btn btn-ghost" onClick={handleContinue}>
              Omitir por ahora
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleContinue}>
              Continuar <Check size={18} style={{marginLeft: 8}}/>
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
