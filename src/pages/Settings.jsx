import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, ArrowLeft, Eye, Volume2, Move, Type, Heart, Palette, Bell, Moon } from 'lucide-react'
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
    <PageWrapper style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Configuración</h1>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* COMPAÑERO SECTION - FLAT DESIGN */}
        <section>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 700 }}>Tu Compañero</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid var(--border-light)' }}>
            <Mascot type="dragon" size="md" mood="happy" />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Ember</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nivel 2 • 820 XP acumulados</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm"><Heart size={14}/> Alimentar</button>
              <button className="btn btn-ghost btn-sm"><Palette size={14}/> Apariencia</button>
            </div>
          </div>
        </section>

        {/* GENERAL SECTION - FLAT LIST */}
        <section>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 700 }}>Preferencias</h2>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
            <SettingRow icon={<Bell size={18}/>} label="Notificaciones de retos" active={true} />
            <SettingRow icon={<Moon size={18}/>} label="Modo noche automático" active={true} />
            <SettingRow icon={<Volume2 size={18}/>} label="Efectos de sonido" active={false} />
          </div>
        </section>

        {/* ACCESSIBILITY SECTION - FLAT TILES */}
        <section>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 700 }}>Accesibilidad Especial</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <AccessTile 
              icon={<Eye size={20}/>} label="Alto contraste" 
              active={access.contrast} onClick={() => toggle('contrast')} 
            />
            <AccessTile 
              icon={<Volume2 size={20}/>} label="Lectura de pantalla" 
              active={access.voice} onClick={() => toggle('voice')} 
            />
            <AccessTile 
              icon={<Move size={20}/>} label="Animaciones suaves" 
              active={access.animations} onClick={() => toggle('animations')} 
            />
            <AccessTile 
              icon={<Type size={20}/>} label="Texto ampliado" 
              active={access.largeText} onClick={() => toggle('largeText')} 
            />
          </div>
        </section>
      </div>
    </PageWrapper>
  )
}

function SettingRow({ icon, label, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ color: 'var(--primary-light)' }}>{icon}</div>
      <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
      <div className="toggle-switch"><input type="checkbox" defaultChecked={active} /><span className="toggle-slider"/></div>
    </div>
  )
}

function AccessTile({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '20px', borderRadius: '16px', background: active ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
        display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%'
      }}
    >
      <div style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{icon}</div>
      <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: active ? '#fff' : 'var(--text-muted)' }}>{label}</div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'var(--primary)' : 'transparent', border: active ? 'none' : '2px solid var(--text-dim)' }} />
    </button>
  )
}
