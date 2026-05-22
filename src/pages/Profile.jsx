import { useNavigate } from 'react-router-dom'
import { User, Shield, LogOut, ArrowLeft } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'

export default function Profile() {
  const navigate = useNavigate()

  return (
    <PageWrapper style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.8rem' }}>Mi Perfil</h1>
      </header>

      <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', background: 'var(--surface-2)', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>🦊</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Sofía García</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Estudiante • 14 años</p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 24 }}>sofia.garcia@eduapp.com</p>
        
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
            <User size={16} /> Editar Información Personal
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
            <Shield size={16} /> Seguridad de la Cuenta
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--error)', justifyContent: 'center' }} onClick={() => navigate('/login')}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>
    </PageWrapper>
  )
}
