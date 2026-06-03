import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, LogOut, Users, GraduationCap, Heart, Mail, IdCard, KeyRound, Building2, BookOpen, Cake } from 'lucide-react'
import { useState } from 'react'
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
  const { user, logout, studentId, linkedStudents: contextLinked } = useAuth()
  const [showPwd, setShowPwd] = useState(false)

  const role = user?.role || 'student'
  const meta = ROLE_META[role]

  // Load prefs (avatar, pet, etc.) as fallback
  const prefs = (() => {
    try { return JSON.parse(localStorage.getItem('eduapp_prefs') || '{}') }
    catch { return {} }
  })()

  // Profile data comes from Supabase via AuthContext
  const fullProfile = user?.fullProfile || {}
  const petType = fullProfile.pet_type || prefs.pet
  const petName = fullProfile.pet_name || prefs.petName
  const linkedStudents = contextLinked || []
  const passwordPlain = fullProfile.password || ''
  const dni = fullProfile.dni || ''

  async function handleLogout() {
    try { await logout() } catch { /* ignore */ }
    navigate('/login')
  }

  return (
    <PageWrapper className="profile-page">
      <header className="profile-header">
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
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

        {role === 'student' && petType && (
          <div className="profile-pet">
            Mascota: {petName || petType}
          </div>
        )}
      </div>

      {/* Credenciales — siempre visibles */}
      <div className="profile-info-card">
        <div className="profile-info-section">
          <h3>Identidad</h3>
          <InfoRow icon={<Mail size={14}/>} label="Correo" value={user?.email || '—'} copyable />
          <InfoRow icon={<IdCard size={14}/>} label="DNI" value={dni || '—'} copyable />
          <InfoRow
            icon={<KeyRound size={14}/>}
            label="Contraseña"
            value={showPwd ? (passwordPlain || '—') : (passwordPlain ? '••••••••' : '—')}
            onClick={() => passwordPlain && setShowPwd(!showPwd)}
            copyable={!!passwordPlain}
          />
          <InfoRow
            icon={<KeyRound size={14}/>}
            label="ID de cuenta"
            value={studentId?.slice(0, 16) + (studentId?.length > 16 ? '…' : '') || '—'}
            copyable
          />
        </div>

        <div className="profile-info-section">
          <h3>Rol y datos académicos</h3>
          <InfoRow label="Rol" value={meta.label} />
          {role === 'student' && (
            <>
              <InfoRow icon={<Cake size={14}/>} label="Rango de edad" value={fullProfile.age_band || '—'} />
              <InfoRow icon={<Building2 size={14}/>} label="Institución" value={fullProfile.institution || '—'} />
              <InfoRow icon={<BookOpen size={14}/>} label="Mascota" value={petName ? `${petName} (${petType})` : '—'} />
            </>
          )}
          {role === 'teacher' && (
            <>
              <InfoRow icon={<Building2 size={14}/>} label="Institución" value={fullProfile.institution || '—'} />
              <InfoRow icon={<BookOpen size={14}/>} label="Materia" value={fullProfile.subject || '—'} />
            </>
          )}
          {role === 'parent' && (
            <>
              <InfoRow label="Relación" value={fullProfile.relation || '—'} />
              <InfoRow label="Estudiantes vinculados" value={linkedStudents.length > 0 ? linkedStudents.map(s => s.name).join(', ') : 'Ninguno'} />
            </>
          )}
        </div>
      </div>

      <button className="profile-logout-btn" onClick={handleLogout}>
        <LogOut size={18} /> Cerrar Sesión
      </button>
    </PageWrapper>
  )
}

function InfoRow({ label, value, icon, onClick, copyable }) {
  const [localCopied, setLocalCopied] = useState(false)
  function handleCopy(e) {
    e.stopPropagation()
    if (!copyable || !value || value === '—') return
    navigator.clipboard?.writeText(String(value))
    setLocalCopied(true)
    setTimeout(() => setLocalCopied(false), 1500)
  }
  return (
    <div className="profile-info-row" onClick={onClick} style={{ cursor: onClick || copyable ? 'pointer' : 'default' }}>
      <span className="profile-info-label">
        {icon && <span className="profile-info-icon">{icon}</span>}
        {label}
      </span>
      <span className="profile-info-value">
        {value}
        {copyable && value && value !== '—' && (
          <button
            type="button"
            className="profile-info-copy"
            onClick={handleCopy}
            aria-label={`Copiar ${label}`}
          >
            {localCopied ? <Check size={12} color="#22C55E" /> : <Copy size={12}/>}
          </button>
        )}
      </span>
    </div>
  )
}
