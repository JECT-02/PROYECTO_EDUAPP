import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, LogOut, Users, GraduationCap, Heart } from 'lucide-react'
import { useState } from 'react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'

const ROLE_META = {
  teacher: { label: 'Docente', icon: <GraduationCap size={16}/> },
  student: { label: 'Estudiante', icon: <Heart size={16}/> },
  parent: { label: 'Padre/Madre', icon: <Users size={16}/> },
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [copied, setCopied] = useState(false)

  const role = user?.role || 'student'
  const meta = ROLE_META[role]

  // Load prefs (avatar, pet, etc.)
  const prefs = (() => {
    try { return JSON.parse(localStorage.getItem('eduapp_prefs') || '{}') }
    catch { return {} }
  })()

  // Student-specific data
  const studentId = user?.studentId
  const extra = studentId
    ? JSON.parse(localStorage.getItem('eduapp_student_extra') || '{}')[studentId] || {}
    : {}

  // Parent-specific data
  const linkedStudents = user?.linkedStudents || []

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

  return (
    <PageWrapper style={{ padding: '48px 40px', maxWidth: 600, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Mi Perfil</h1>
      </header>

      {/* Avatar + nombre + rol */}
      <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          fontSize: '4rem', width: 100, height: 100, borderRadius: '50%',
          background: 'var(--surface-2)', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {prefs.avatar || user?.avatar || '🦊'}
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>{user?.name || 'Usuario'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {meta.icon} {meta.label}
        </p>

        {/* Pet info (if available) */}
        {prefs.pet && (
          <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Mascota: {prefs.petName || prefs.pet}
          </div>
        )}
      </div>

      {/* Student ID (solo estudiantes) */}
      {role === 'student' && studentId && (
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

      {/* Información según el rol */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
        {/* Fila común: Email */}
        <InfoRow label="Correo" value={user?.email || '—'} />
        <InfoRow label="Rol" value={meta.label} />

        {/* Información de estudiante */}
        {role === 'student' && (
          <>
            <InfoRow label="DNI" value={studentId || '—'} />
            <InfoRow label="Grado" value={extra.grade || '—'} />
            <InfoRow label="Edad" value={extra.age || '—'} />
            <InfoRow label="DNI Apoderado" value={extra.guardianDni || '—'} last />
          </>
        )}

        {/* Información de padre */}
        {role === 'parent' && (
          <InfoRow
            label="Estudiantes vinculados"
            value={linkedStudents.length > 0 ? linkedStudents.map(s => s.name).join(', ') : 'Ninguno'}
            last
          />
        )}

        {/* Información de docente — solo email y rol, ya mostrados */}
        {role === 'teacher' && (
          <InfoRow label="Nombre" value={user?.name || '—'} last />
        )}
      </div>

      {/* Cerrar sesión */}
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

function InfoRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}
