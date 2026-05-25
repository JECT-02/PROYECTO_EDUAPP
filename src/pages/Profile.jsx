import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, LogOut } from 'lucide-react'
import { useState } from 'react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [copied, setCopied] = useState(false)

  const studentId = user?.studentId

  // Load extra student data saved during registration
  const extra = studentId
    ? JSON.parse(localStorage.getItem('eduapp_student_extra') || '{}')[studentId] || {}
    : {}

  function copyId() {
    if (studentId) {
      navigator.clipboard?.writeText(studentId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const infoRows = [
    { label: 'Nombre', value: user?.name || '—' },
    { label: 'Correo', value: user?.email || '—' },
    { label: 'DNI', value: studentId || '—' },
    { label: 'Grado', value: extra.grade || '—' },
    { label: 'Edad', value: extra.age || '—' },
    { label: 'DNI Apoderado', value: extra.guardianDni || '—' },
  ]

  return (
    <PageWrapper style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Mi Perfil</h1>
      </header>

      {/* Avatar + nombre */}
      <div className="card" style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          fontSize: '4rem', width: 100, height: 100, borderRadius: '50%',
          background: 'var(--surface-2)', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          🦊
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>{user?.name || 'Usuario'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Estudiante</p>
      </div>

      {/* Student ID copiable */}
      {studentId && (
        <div
          onClick={copyId}
          className="card"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', marginBottom: 20, cursor: 'pointer',
          }}
          title="Copiar ID de estudiante"
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID de Estudiante</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-light)',
            }}>
              {studentId}
            </span>
            {copied ? <Check size={16} color="#22C55E" /> : <Copy size={16} style={{ color: 'var(--text-dim)' }} />}
          </span>
        </div>
      )}

      {/* Info del estudiante */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
        {infoRows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px',
              borderBottom: i < infoRows.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.label}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Cerrar sesion */}
      <button
        className="card"
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '16px 20px', width: '100%', cursor: 'pointer',
          color: 'var(--error)', fontWeight: 700, fontSize: '0.95rem',
          border: '1px solid rgba(239,68,68,0.2)',
          transition: 'all 0.2s',
        }}
      >
        <LogOut size={18} /> Cerrar Sesión
      </button>
    </PageWrapper>
  )
}
