import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const routes = { student: '/dashboard', teacher: '/teacher', parent: '/parent' }

  function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    setTimeout(() => {
      setLoading(false)
      navigate(routes[role] || '/dashboard')
    }, 1400)
  }

  return (
    <PageWrapper>
      <div className="login-page">
        {/* Left panel */}
        <div className="login-left hide-mobile">
          <div className="login-brand">
            <div className="brand-icon">✦</div>
            <span className="brand-name">EduApp</span>
          </div>
          <div className="login-hero">
            <h1 className="login-hero-title">Aprende sin límites.<br /><span className="gradient-text">Tu IA te guía.</span></h1>
            <p className="login-hero-sub">Rutas personalizadas, feedback inteligente, gamificación real.</p>
          </div>
          <div className="features-list">
            {['🗺️ Roadmap adaptativo con IA','🎮 Gamificación y mascotas','♿ Accesibilidad WCAG 2.1 AA','📊 Analytics en tiempo real'].map(f => (
              <div key={f} className="feature-item">{f}</div>
            ))}
          </div>
          {/* Floating cards */}
          <div className="float-card card fc1">
            <span className="fc-emoji">🏆</span>
            <div><div className="fc-title">Maestría lograda</div><div className="fc-sub">Fotosíntesis · 94%</div></div>
          </div>
          <div className="float-card card fc2 animate-float">
            <span className="fc-emoji">🐲</span>
            <div><div className="fc-title">Ember</div><div className="fc-sub">Nivel 2 · 820 XP</div></div>
          </div>
          <div className="float-card card fc3">
            <span className="fc-emoji">⚡</span>
            <div><div className="fc-title">Racha activa</div><div className="fc-sub">7 días seguidos</div></div>
          </div>
        </div>

        {/* Right panel - form */}
        <div className="login-right">
          <div className="login-form-wrap card">
            <div className="form-header">
              <div className="brand-icon sm">✦</div>
              <h2>Bienvenido de vuelta</h2>
              <p>Inicia sesión para continuar tu camino</p>
            </div>

            {/* Demo role selector */}
            <div className="role-demo-bar">
              <span className="role-demo-label">Demo rápida:</span>
              {['student','teacher','parent'].map(r => (
                <button key={r} className={`role-chip ${role===r?'active':''}`} onClick={() => setRole(r)}>
                  {r==='student'?'👨‍🎓 Estudiante':r==='teacher'?'👩‍🏫 Docente':'👨‍👩‍👧 Padre'}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <label htmlFor="email">Correo electrónico</label>
                <div className="input-icon-wrap">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="email" type="email" className="input-field with-icon"
                    placeholder="tu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Contraseña</label>
                <div className="input-icon-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="password" type={show ? 'text' : 'password'} className="input-field with-icon pr"
                    placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" className="eye-btn" onClick={() => setShow(!show)}>
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {error && <div className="form-error">⚠️ {error}</div>}

              <button
                type="submit"
                className={`btn btn-primary btn-lg full-w ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? <span className="spinner"/> : <><ArrowRight size={18}/> Iniciar sesión</>}
              </button>

              <div className="form-divider"><span>o continúa con</span></div>
              <div className="oauth-row">
                <button type="button" className="oauth-btn">
                  <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google"/>
                  Google
                </button>
                <button type="button" className="oauth-btn">
                  <span style={{fontSize:16}}>🪟</span> Microsoft
                </button>
              </div>
            </form>

            <div className="form-footer">
              <button className="link-btn" onClick={() => navigate('/register')}>
                <Sparkles size={14}/> Crear cuenta nueva
              </button>
              <button className="link-btn muted" onClick={() => navigate('/register')}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
