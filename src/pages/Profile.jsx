import { useNavigate } from 'react-router-dom'
import { User, Settings, ArrowLeft, Heart, Shield, LogOut } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'

export default function Profile() {
  const navigate = useNavigate()

  return (
    <PageWrapper style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.8rem' }}>Mi Perfil</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Profile Info */}
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', background: 'var(--surface-2)', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>🦊</div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Sofía García</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Estudiante • 14 años</p>
          
          <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 12 }}>
            <User size={16} /> Editar Datos
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }}>
            <Shield size={16} /> Privacidad y Seguridad
          </button>
        </div>

        {/* Mascot Info */}
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Mascot type="dragon" size="lg" mood="happy" />
          <h2 style={{ fontSize: '1.4rem', marginTop: 16, marginBottom: 4 }}>Ember</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Nivel 2 • 820 XP</p>
          
          <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 12 }}>
            <Heart size={16} /> Alimentar a Ember
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }}>
            <Settings size={16} /> Cambiar Mascota
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
         <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => navigate('/login')}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
      </div>
    </PageWrapper>
  )
}
