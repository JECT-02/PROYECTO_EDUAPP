import { useNavigate } from 'react-router-dom'
import { User, Shield, LogOut, ArrowLeft, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const studentId = user?.studentId

  function copyId() {
    if (studentId) {
      navigator.clipboard?.writeText(studentId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <PageWrapper style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.8rem' }}>Mi Perfil</h1>
      </header>

      <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', background: 'var(--surface-2)', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>🦊</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 4 }}>{user?.name || 'Sofía García'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Estudiante • 14 años</p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 8 }}>{user?.email || 'sofia.garcia@eduapp.com'}</p>

        {/* Student ID */}
        {studentId && (
          <div
            onClick={copyId}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(108,99,255,0.08)',
              border: '1px solid rgba(108,99,255,0.2)',
              borderRadius: 10, padding: '8px 16px',
              cursor: 'pointer', transition: 'all 0.2s',
              marginBottom: 24,
            }}
            title="Copiar ID de estudiante"
          >
            <span style={{
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontSize: '0.9rem', fontWeight: 700,
              color: 'var(--primary-light)',
            }}>
              {studentId}
            </span>
            {copied ? (
              <Check size={14} style={{ color: '#22C55E' }} />
            ) : (
              <Copy size={14} style={{ color: 'var(--text-dim)' }} />
            )}
          </div>
        )}

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
