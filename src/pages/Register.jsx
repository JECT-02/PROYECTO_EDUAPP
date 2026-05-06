import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, GraduationCap, BookOpen, Users } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import './Register.css'

const ROLES = [
  { id:'student', icon:<GraduationCap size={32}/>, title:'Soy Estudiante', desc:'Aprende con rutas personalizadas, IA y gamificación', color:'#6C63FF' },
  { id:'teacher', icon:<BookOpen size={32}/>, title:'Soy Docente', desc:'Crea cursos, sube material y supervisa el avance', color:'#22C55E' },
  { id:'parent', icon:<Users size={32}/>, title:'Soy Padre/Tutor', desc:'Monitorea el progreso de tus hijos vinculados', color:'#F59E0B' },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [form, setForm] = useState({ name:'', email:'', password:'', age:'', institution:'' })
  const [otp, setOtp] = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)

  function next() {
    if (step === 3) {
      setLoading(true)
      setTimeout(() => { setLoading(false); navigate('/onboarding/accessibility') }, 1500)
    } else setStep(s => Math.min(s+1, 3))
  }

  function handleOtp(i, val) {
    const newOtp = [...otp]
    newOtp[i] = val.slice(-1)
    setOtp(newOtp)
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus()
  }

  return (
    <PageWrapper>
      <div className="register-page">
        <div className="register-wrap card">
          {/* Progress */}
          <div className="register-steps">
            {['Rol','Datos','Verifica'].map((s,i) => (
              <div key={s} className={`step-item ${step>i+1?'done':step===i+1?'active':''}`}>
                <div className="step-circle">{step>i+1?'✓':i+1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Step 1 - Role */}
          {step === 1 && (
            <div className="step-content animate-fadeInUp">
              <h2 className="step-title">¿Quién eres?</h2>
              <p className="step-sub">Selecciona tu rol para personalizar la experiencia</p>
              <div className="role-cards">
                {ROLES.map(r => (
                  <div
                    key={r.id}
                    className={`role-card card ${role===r.id?'selected':''}`}
                    style={{ '--role-color': r.color }}
                    onClick={() => setRole(r.id)}
                  >
                    <div className="role-card-icon" style={{ color: r.color, background:`${r.color}18` }}>
                      {r.icon}
                    </div>
                    <div className="role-card-title">{r.title}</div>
                    <div className="role-card-desc">{r.desc}</div>
                    {role===r.id && <div className="role-check" style={{background:r.color}}>✓</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 - Data */}
          {step === 2 && (
            <div className="step-content animate-fadeInUp">
              <h2 className="step-title">Crea tu cuenta</h2>
              <p className="step-sub">Completa tus datos para comenzar</p>
              <div className="register-form">
                {[
                  { label:'Nombre completo', key:'name', type:'text', ph:'Ana Martínez' },
                  { label:'Correo electrónico', key:'email', type:'email', ph:'ana@email.com' },
                  { label:'Contraseña', key:'password', type:'password', ph:'Mín. 8 caracteres' },
                ].map(f => (
                  <div className="input-group" key={f.key}>
                    <label>{f.label}</label>
                    <input
                      type={f.type} className="input-field" placeholder={f.ph}
                      value={form[f.key]} onChange={e => setForm(prev => ({...prev, [f.key]:e.target.value}))}
                    />
                  </div>
                ))}
                {role==='student' && (
                  <div className="input-group">
                    <label>Grupo de edad</label>
                    <select className="input-field" value={form.age} onChange={e => setForm(p=>({...p,age:e.target.value}))}>
                      <option value="">Seleccionar...</option>
                      {['7-10 años','11-14 años','15-17 años','18+ años'].map(a=><option key={a}>{a}</option>)}
                    </select>
                  </div>
                )}
                {role==='teacher' && (
                  <div className="input-group">
                    <label>Institución educativa</label>
                    <input type="text" className="input-field" placeholder="Colegio / Universidad"
                      value={form.institution} onChange={e => setForm(p=>({...p,institution:e.target.value}))} />
                  </div>
                )}
                <label className="checkbox-row">
                  <input type="checkbox" /> Acepto los <span className="link-inline">términos y política de privacidad</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 3 - OTP */}
          {step === 3 && (
            <div className="step-content animate-fadeInUp">
              <div className="otp-icon">📧</div>
              <h2 className="step-title">Verifica tu correo</h2>
              <p className="step-sub">Ingresa el código de 6 dígitos enviado a <strong>{form.email||'tu correo'}</strong></p>
              <div className="otp-inputs">
                {otp.map((v,i) => (
                  <input
                    key={i} id={`otp-${i}`} type="text"
                    className="otp-box" maxLength={1} value={v}
                    onChange={e => handleOtp(i, e.target.value)}
                  />
                ))}
              </div>
              <button className="link-btn" style={{margin:'0 auto', marginTop:8}}>Reenviar código</button>
            </div>
          )}

          {/* Navigation */}
          <div className="register-nav">
            {step > 1 && (
              <button className="btn btn-ghost" onClick={() => setStep(s=>s-1)}>
                <ChevronLeft size={16}/> Atrás
              </button>
            )}
            <button
              className={`btn btn-primary ${loading?'loading':''}`}
              onClick={next}
              disabled={(step===1 && !role) || loading}
              style={{marginLeft:'auto'}}
            >
              {loading ? <span className="spinner"/> : step===3 ? '¡Comenzar! 🚀' : <>Siguiente <ChevronRight size={16}/></>}
            </button>
          </div>

          <p className="register-login">
            ¿Ya tienes cuenta?{' '}
            <button className="link-btn" onClick={() => navigate('/login')}>Iniciar sesión</button>
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
