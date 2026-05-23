import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Eye, Volume2, Move, Type,
  Heart, Palette, Bell, Moon, Users, BookOpen,
  Calendar, BellRing, RefreshCw, Sparkles, Clock
} from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role || 'student'

  const [access, setAccess] = useState({
    contrast: false,
    voice: false,
    animations: true,
    largeText: false
  })

  const toggle = (key) => setAccess(p => ({ ...p, [key]: !p[key] }))

  const roleLabels = {
    teacher: 'Docente',
    student: 'Estudiante',
    parent: 'Padre',
  }

  return (
    <PageWrapper style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Configuración</h1>
          <span style={{
            fontSize: '0.75rem', color: 'var(--text-muted)',
            background: 'rgba(108,99,255,0.15)', color: 'var(--primary-light)',
            padding: '2px 10px', borderRadius: 20, display: 'inline-block', marginTop: 4
          }}>
            {roleLabels[role]}
          </span>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* --- STUDENT: COMPAÑERO SECTION --- */}
        {role === 'student' && (
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
        )}

        {/* --- TEACHER: GESTION DE CURSOS SECTION --- */}
        {role === 'teacher' && (
          <section>
            <h2 style={{ fontSize: '1rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 700 }}>Gestión de Cursos</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
              <SettingRow icon={<Users size={18}/>} label="Notificar cuando un estudiante se inscribe" active={true} />
              <SettingRow icon={<BellRing size={18}/>} label="Alertas de inactividad de estudiantes" active={true} />
              <SettingRow icon={<RefreshCw size={18}/>} label="Auto-generar contenido al crear curso" active={true} />
              <SettingRow icon={<BookOpen size={18}/>} label="Plantilla de curso por defecto" active={false} />
            </div>
          </section>
        )}

        {/* --- PARENT: NOTIFICACIONES FAMILIARES SECTION --- */}
        {role === 'parent' && (
          <section>
            <h2 style={{ fontSize: '1rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 700 }}>Notificaciones Familiares</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
              <SettingRow icon={<Sparkles size={18}/>} label="Notificar nuevos logros y medallas" active={true} />
              <SettingRow icon={<Calendar size={18}/>} label="Resumen semanal de actividad" active={true} />
              <SettingRow icon={<BellRing size={18}/>} label="Alertas de bajo rendimiento" active={true} />
              <SettingRow icon={<Clock size={18}/>} label="Tiempo de estudio diario" active={false} />
            </div>
          </section>
        )}

        {/* --- PREFERENCIAS GENERALES (ALL ROLES) --- */}
        <section>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 700 }}>
            {role === 'teacher' ? 'Preferencias Generales' : 'Preferencias'}
          </h2>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
            <SettingRow 
              icon={<Bell size={18}/>} 
              label={role === 'student' ? 'Notificaciones de retos' : 'Notificaciones del sistema'} 
              active={true} 
            />
            <SettingRow icon={<Moon size={18}/>} label="Modo noche automático" active={true} />
            <SettingRow icon={<Volume2 size={18}/>} label="Efectos de sonido" active={false} />
          </div>
        </section>

        {/* --- ACCESIBILIDAD (ALL ROLES) --- */}
        <section>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 700 }}>Accesibilidad</h2>
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
