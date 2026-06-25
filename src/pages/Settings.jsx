import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Volume2, Eye, Type, Move, Mic, Glasses, Smartphone } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { useVoice } from '../context/VoiceContext'
import './Settings.css'

const PREF_OPTIONS = [
  { key: 'notifications', label: 'Notificaciones' },
  { key: 'sound', label: 'Efectos de sonido' },
  { key: 'vibration', label: 'Vibración' },
]

const ACCESSIBILITY_OPTIONS = [
  { key: 'contrast', label: 'Modo de alto contraste', desc: 'Máximo contraste en colores', icon: <Eye size={20} /> },
  { key: 'reduced', label: 'Reducir animaciones', desc: 'Fades simples en lugar de efectos complejos', icon: <Move size={20} /> },
  { key: 'voice', label: 'Navegación por voz', desc: 'Controla la app con comandos de voz', icon: <Mic size={20} /> },
  { key: 'largeText', label: 'Texto grande', desc: 'Aumenta el tamaño de letra base', icon: <Type size={20} /> },
  { key: 'colorblind', label: 'Modo para daltónismo', desc: 'Paletas de color accesibles', icon: <Glasses size={20} /> },
]

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const { voiceEnabled, toggleVoice } = useVoice()

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('eduapp_prefs')
      const parsed = saved ? JSON.parse(saved) : {}
      if (parsed.notifications === undefined) parsed.notifications = true
      return parsed
    } catch { return { notifications: true } }
  })

  const toggle = (key) => {
    const nextVal = !prefs[key]
    setPrefs(p => {
      const next = { ...p, [key]: nextVal }
      localStorage.setItem('eduapp_prefs', JSON.stringify(next))
      return next
    })
    // Apply body classes first (local effects always work)
    if (key === 'contrast') document.body.classList.toggle('high-contrast', nextVal)
    if (key === 'reduced') document.body.classList.toggle('reduce-motion', nextVal)
    if (key === 'colorblind') document.body.classList.toggle('colorblind', nextVal)
    if (key === 'largeText') {
      document.body.classList.toggle('large-text', nextVal)
      document.documentElement.style.fontSize = nextVal ? '18px' : ''
    }
    // Notify Header to refresh notifications
    if (key === 'notifications') {
      window.dispatchEvent(new CustomEvent('eduapp-prefs-changed', { detail: { key, value: nextVal } }))
    }
    // Persist accessibility settings to Supabase
    if (user?.id) {
      const acc = prefs
      const merged = {
        contrast: key === 'contrast' ? nextVal : !!acc.contrast,
        narration: !!acc.voice,
        reduced: key === 'reduced' ? nextVal : !!acc.reduced,
        voice: key === 'voice' ? nextVal : !!acc.voice,
        large_text: key === 'largeText' ? nextVal : !!acc.largeText,
        colorblind: key === 'colorblind' ? nextVal : !!acc.colorblind,
      }
      updateProfile({ accessibility_settings: merged }).catch(() => {})
    }
  }

  return (
    <PageWrapper className="settings-page">
      {/* Header */}
      <header className="settings-header" role="banner" aria-label="Encabezado de configuración">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={18} aria-hidden="true" /></button>
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
          <SettingRow icon={<Bell size={18} />} label="Notificaciones" active={!!prefs.notifications} onToggle={() => toggle('notifications')} />
          <SettingRow icon={<Volume2 size={18} />} label="Efectos de sonido" active={!!prefs.sound} onToggle={() => toggle('sound')} />
          <SettingRow icon={<Smartphone size={18} />} label="Vibración" active={!!prefs.vibration} onToggle={() => toggle('vibration')} />
        </div>

        {/* Accesibilidad — mismas opciones que el onboarding */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">
              Accesibilidad
            </h2>
          </div>
          {ACCESSIBILITY_OPTIONS.map((opt) => (
            <SettingRow
              key={opt.key}
              icon={opt.icon}
              label={opt.label}
              desc={opt.desc}
              active={opt.key === 'voice' ? voiceEnabled : !!prefs[opt.key]}
              onToggle={() => {
                if (opt.key === 'voice') {
                  toggleVoice()
                  // Persist voice to profile
                  if (user?.id) {
                    const merged = {
                      contrast: !!prefs.contrast,
                      reduced: !!prefs.reduced,
                      voice: !voiceEnabled,
                      large_text: !!prefs.largeText,
                      colorblind: !!prefs.colorblind,
                    }
                    updateProfile({ accessibility_settings: merged }).catch(() => {})
                  }
                } else {
                  toggle(opt.key)
                }
              }}
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
      <div className="setting-icon" aria-hidden="true">{icon}</div>
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {desc && <span className="setting-desc">{desc}</span>}
      </div>
      <label className="toggle-switch" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={active} onChange={onToggle} aria-label={`${label}: ${active ? 'sí' : 'no'}`} />
        <span className="toggle-slider" aria-hidden="true" />
      </label>
    </div>
  )
}


