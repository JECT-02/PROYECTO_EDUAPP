import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, ArrowLeft, Eye, Volume2, Move, Type, Heart, Palette } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'

export default function Settings() {
  const navigate = useNavigate()
  const [access, setAccess] = useState({
    contrast: false,
    voice: false,
    animations: true,
    largeText: false
  })

  const toggle = (key) => setAccess(p => ({ ...p, [key]: !p[key] }))

  return (
    <PageWrapper style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.8rem' }}>Configuración</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
        {/* Mascot Settings */}
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Mascot type="dragon" size="lg" mood="happy" />
          <h2 style={{ fontSize: '1.4rem', marginTop: 16, marginBottom: 4 }}>Tu Compañero</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Personaliza a Ember</p>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              <Heart size={16} /> Cambiar Mascota
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              <Palette size={16} /> Cambiar Colores
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Preferencias Generales</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Notificaciones Push</span>
              <div className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"/></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Sonido Ambiental</span>
              <div className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"/></div>
            </div>
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={20} style={{ color: 'var(--primary)' }}/> Opciones de Accesibilidad
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <AccessToggle 
              icon={<Eye size={18}/>} label="Alto contraste" 
              active={access.contrast} onClick={() => toggle('contrast')} 
            />
            <AccessToggle 
              icon={<Volume2 size={18}/>} label="Narración por voz" 
              active={access.voice} onClick={() => toggle('voice')} 
            />
            <AccessToggle 
              icon={<Move size={18}/>} label="Animaciones" 
              active={access.animations} onClick={() => toggle('animations')} 
            />
            <AccessToggle 
              icon={<Type size={18}/>} label="Texto grande" 
              active={access.largeText} onClick={() => toggle('largeText')} 
            />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function AccessToggle({ icon, label, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        padding: '16px', borderRadius: '12px', background: active ? 'rgba(108,99,255,0.1)' : 'var(--surface-2)',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      <div style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{icon}</div>
      <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{label}</div>
      <div style={{ 
        width: '36px', height: '20px', borderRadius: '10px', background: active ? 'var(--primary)' : '#444',
        position: 'relative', transition: 'all 0.2s'
      }}>
        <div style={{ 
          width: '14px', height: '14px', borderRadius: '50%', background: 'white',
          position: 'absolute', top: '3px', left: active ? '19px' : '3px', transition: 'all 0.2s'
        }} />
      </div>
    </div>
  )
}
