import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, GraduationCap, BookOpen, Users, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import './Register.css'

const ROLES = [
  {
    id: 'student',
    icon: <GraduationCap size={32}/>,
    title: 'Soy Estudiante',
    desc: 'Aprende con rutas personalizadas, IA y gamificación',
    color: '#6C63FF'
  },
  {
    id: 'teacher',
    icon: <BookOpen size={32}/>,
    title: 'Soy Docente',
    desc: 'Crea cursos, sube material y supervisa el avance',
    color: '#22C55E'
  },
  {
    id: 'parent',
    icon: <Users size={32}/>,
    title: 'Soy Padre / Tutor',
    desc: 'Monitorea el progreso y el bienestar de tu hijo',
    color: '#F59E0B'
  },
]

const GRADES = [
  '1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria',
  '1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria',
  'Superior / Universidad',
]

const SUBJECTS = ['Matemáticas','Ciencias Naturales','Física','Química','Historia','Lengua','Programación','Arte','Otros']
const RELATIONS = ['Padre','Madre','Tutor legal','Abuelo/a','Otro']

export default function Register() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()

  // Si ya está autenticado al montar el componente, redirigir (solo en mount, no interfiere con registro)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [])
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    // Student fields
    dni: '', guardianDni: '', grade: '', age: '',
    // Teacher fields
    institution: '', subject: '',
    // Parent fields
    relation: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)

  const upd = (key, val) => setForm(p => ({ ...p, [key]: val }))

  function canAdvance() {
    if (step === 1) return !!role
    if (step === 2) {
      const base = form.firstName && form.lastName && form.email && form.password
      if (role === 'student') return base && form.dni && form.guardianDni && form.grade
      if (role === 'teacher') return base && form.institution && form.subject
      if (role === 'parent') return base && form.relation
      return base
    }
    return true
  }

  function next() {
    if (!canAdvance()) return
    if (step === 3) {
      setLoading(true)
      setTimeout(() => {
        // Login the user so DNI is used as student ID at registration time
        login(form.email, role, `${form.firstName} ${form.lastName}`, form.dni)
        // Save extra student data for profile display
        if (role === 'student' && form.dni) {
          const extra = JSON.parse(localStorage.getItem('eduapp_student_extra') || '{}')
          extra[form.dni] = { grade: form.grade, age: form.age, guardianDni: form.guardianDni }
          localStorage.setItem('eduapp_student_extra', JSON.stringify(extra))
        }
        setLoading(false)
        navigate('/onboarding/accessibility')
      }, 1500)
    } else {
      setStep(s => Math.min(s + 1, 3))
    }
  }

  function handleOtp(i, val) {
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n)
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus()
  }

  return (
    <PageWrapper>
      <div className="register-page">
        <div className="reg-deco-grid" />
        <div className="register-wrap">

          {/* Progress steps */}
          <div className="register-steps">
            {['Rol','Datos','Verifica'].map((s, i) => (
              <div key={s} className={`step-item ${step > i+1 ? 'done' : step === i+1 ? 'active' : ''}`}>
                <div className="step-circle">
                  {step > i+1 ? <CheckCircle size={16}/> : i+1}
                </div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Step 1 — Role selection */}
          {step === 1 && (
            <div className="step-content animate-fadeInUp">
              <h2 className="step-title">¿Quién eres?</h2>
              <p className="step-sub">Selecciona tu rol para personalizar la experiencia</p>
              <div className="role-cards">
                {ROLES.map(r => (
                  <div
                    key={r.id}
                    className={`role-card ${role === r.id ? 'selected' : ''}`}
                    style={{ '--role-color': r.color }}
                    onClick={() => setRole(r.id)}
                  >
                    <div className="role-card-icon" style={{ color: r.color, background: `${r.color}18` }}>
                      {r.icon}
                    </div>
                    <div className="role-card-title">{r.title}</div>
                    <div className="role-card-desc">{r.desc}</div>
                    {role === r.id && <div className="role-check" style={{ background: r.color }}>✓</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Data (role-specific) */}
          {step === 2 && (
            <div className="step-content animate-fadeInUp">
              <h2 className="step-title">Crea tu cuenta</h2>
              <p className="step-sub">
                {role === 'student' && 'Completa tus datos personales y escolares'}
                {role === 'teacher' && 'Completa tus datos y tu información institucional'}
                {role === 'parent' && 'Completa tus datos personales'}
              </p>

              <div className="register-form">

                {/* === INFORMATION PERSONAL === */}
                <div className="register-section-label">Información personal</div>
                  <div className="input-group">
                    <label>Nombres</label>
                    <input type="text" className="input-field" placeholder="Ana María"
                      value={form.firstName} onChange={e => upd('firstName', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Apellidos</label>
                    <input type="text" className="input-field" placeholder="Martínez López"
                      value={form.lastName} onChange={e => upd('lastName', e.target.value)} />
                  </div>

                <div className="input-group">
                  <label>Correo electrónico</label>
                  <input type="email" className="input-field" placeholder="ana@email.com"
                    value={form.email} onChange={e => upd('email', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Contraseña</label>
                  <div className="input-icon-wrap">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field with-icon pr"
                      placeholder="Mínimo 8 caracteres"
                      value={form.password}
                      onChange={e => upd('password', e.target.value)}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                {/* === STUDENT SPECIFIC === */}
                {role === 'student' && (
                  <>
                    <div className="register-section-label">Información escolar</div>
                    <div className="input-group">
                      <label>Grado escolar</label>
                      <select className="input-field" value={form.grade} onChange={e => upd('grade', e.target.value)}>
                        <option value="">Seleccionar grado...</option>
                        {GRADES.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Grupo de edad</label>
                      <select className="input-field" value={form.age} onChange={e => upd('age', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {['7-10 años','11-14 años','15-17 años','18+ años'].map(a => <option key={a}>{a}</option>)}
                      </select>
                    </div>

                    <div className="register-section-label">Documentos de identidad</div>

                      <div className="input-group">
                        <label>DNI del estudiante</label>
                        <input type="text" className="input-field" placeholder="12345678" maxLength={8}
                          value={form.dni} onChange={e => upd('dni', e.target.value.replace(/\D/g,''))} />
                      </div>
                      <div className="input-group">
                        <label>DNI del apoderado</label>
                        <input type="text" className="input-field" placeholder="87654321" maxLength={8}
                          value={form.guardianDni} onChange={e => upd('guardianDni', e.target.value.replace(/\D/g,''))} />
                      </div>
                    <div className="register-hint">
                      El DNI del apoderado es requerido para validar la cuenta de menores de edad.
                    </div>
                  </>
                )}

                {/* === TEACHER SPECIFIC === */}
                {role === 'teacher' && (
                  <>
                    <div className="register-section-label">Información institucional</div>
                    <div className="input-group">
                      <label>Institución educativa</label>
                      <input type="text" className="input-field" placeholder="Colegio / Universidad / Instituto"
                        value={form.institution} onChange={e => upd('institution', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Materia principal</label>
                      <select className="input-field" value={form.subject} onChange={e => upd('subject', e.target.value)}>
                        <option value="">Seleccionar materia...</option>
                        {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* === PARENT SPECIFIC === */}
                {role === 'parent' && (
                  <>
                    <div className="register-section-label">Relación familiar</div>
                    <div className="input-group">
                      <label>Eres el / la</label>
                      <select className="input-field" value={form.relation} onChange={e => upd('relation', e.target.value)}>
                        <option value="">Seleccionar relación...</option>
                        {RELATIONS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <label className="checkbox-row">
                  <input type="checkbox" />
                  Acepto los <span className="link-inline">términos y política de privacidad</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 3 — OTP verification */}
          {step === 3 && (
            <div className="step-content animate-fadeInUp">
              <div className="otp-icon-wrap">
                <div className="otp-icon-circle">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
              </div>
              <h2 className="step-title">Verifica tu correo</h2>
              <p className="step-sub">
                Ingresa el código de 6 dígitos enviado a <strong>{form.email || 'tu correo'}</strong>
              </p>
              <div className="otp-inputs">
                {otp.map((v, i) => (
                  <input
                    key={i} id={`otp-${i}`} type="text"
                    className="otp-box" maxLength={1} value={v}
                    onChange={e => handleOtp(i, e.target.value)}
                  />
                ))}
              </div>
              <button className="link-btn" style={{ margin: '8px auto 0', display: 'flex' }}>
                Reenviar código
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="register-nav">
            {step > 1 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
                Atrás
              </button>
            )}
            <button
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
              onClick={next}
              disabled={!canAdvance() || loading}
              style={{ marginLeft: 'auto' }}
            >
              {loading
                ? <span className="spinner"/>
                : step === 3
                  ? 'Comenzar'
                  : <> Siguiente <ChevronRight size={16}/></>
              }
            </button>
          </div>

          <p className="register-login">
            Ya tienes cuenta?{' '}
            <button className="link-btn" onClick={() => navigate('/login')}>Iniciar sesión</button>
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
