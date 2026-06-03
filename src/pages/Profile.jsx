import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, LogOut, Users, GraduationCap, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import './Profile.css'

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
    <PageWrapper className="profile-page">
      <header className="profile-header" role="banner" aria-label="Encabezado de perfil">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={18} aria-hidden="true"/></button>
        <h1 className="profile-title">Mi Perfil</h1>
      </header>

      {/* Avatar + nombre + rol */}
      <div className="profile-avatar-card">
        <div className="profile-avatar">
          {prefs.avatar || user?.avatar || '🦊'}
        </div>
        <h2 className="profile-name">{user?.name || 'Usuario'}</h2>
        <p className="profile-role-badge">
          {meta.icon} {meta.label}
        </p>

        {/* Pet info — solo para estudiantes */}
        {role === 'student' && prefs.pet && (
          <div className="profile-pet">
            Mascota: {prefs.petName || prefs.pet}
          </div>
        )}
      </div>

      {/* Student ID (solo estudiantes) */}
      {role === 'student' && studentId && (
        <div
          onClick={copyId}
          className="profile-id-card"
          title="Copiar ID de estudiante"
        >
          <span className="profile-id-label">ID de Estudiante</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="profile-id-value">
              {studentId}
            </span>
            {copied ? <Check size={16} color="#22C55E" /> : <Copy size={16} style={{ color: 'var(--text-dim)' }} />}
          </span>
        </div>
      )}

      {/* Información según el rol */}
      <div className="profile-info-card" role="region" aria-label="Información del usuario">
        {/* Fila común: Email */}
        <InfoRow label="Correo" value={user?.email || '—'} />
        <InfoRow label="Rol" value={meta.label} />

        {/* Información de estudiante */}
        {role === 'student' && (
          <>
            <InfoRow label="DNI" value={studentId || '—'} />
            <InfoRow label="Grado" value={extra.grade || '—'} />
            <InfoRow label="Edad" value={extra.age || '—'} />
            <InfoRow label="DNI Apoderado" value={extra.guardianDni || '—'} />
          </>
        )}

        {/* Información de padre */}
        {role === 'parent' && (
          <InfoRow
            label="Estudiantes vinculados"
            value={linkedStudents.length > 0 ? linkedStudents.map(s => s.name).join(', ') : 'Ninguno'}
          />
        )}

        {/* Información de docente — solo email y rol, ya mostrados */}
        {role === 'teacher' && (
          <InfoRow label="Nombre" value={user?.name || '—'} />
        )}
      </div>

      {/* Cerrar sesión */}
      <button
        className="profile-logout-btn"
        onClick={handleLogout}
      >
        <LogOut size={18} /> Cerrar Sesión
      </button>
    </PageWrapper>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value}</span>
    </div>
  )
}
