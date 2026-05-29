import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Send, GraduationCap, User, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicMode, setMagicMode] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || (!magicMode && !password)) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')

    if (magicMode) {
      // Magic link mode - simulate sending email
      setTimeout(() => {
        setLoading(false)
        setMagicSent(true)
      }, 1000)
      return
    }

    try {
      await login(email, password, role)
      // PublicRoute maneja la redirección al dashboard u onboarding
    } catch (err) {
      setError(err.message || 'Error de inicio de sesión. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="login-page">
        {/* Left editorial panel */}
        <div className="login-left hide-mobile">
          <div className="deco-grid" />
          <div className="login-brand">
            <div className="brand-icon">✦</div>
            <span className="brand-name">EduApp</span>
          </div>
          <div className="login-hero">
            <h1 className="login-hero-title">Aprende sin límites.<br /><span className="hero-highlight">Tu IA te guía.</span></h1>
            <p className="login-hero-sub">Rutas personalizadas, retroalimentación inteligente y gamificación real.</p>
          </div>
          <div className="features-list">
            {[
              'Roadmap adaptativo con IA',
              'Gamificación y mascotas',
              'Accesibilidad WCAG 2.1 AA',
              'Analítica en tiempo real'
            ].map(f => (
              <div key={f} className="feature-item">{f}</div>
            ))}
          </div>
        </div>

        {/* Right panel - form */}
        <div className="login-right">
          <div className="login-form-wrap">
            <div className="form-header">
              <div className="brand-icon sm">✦</div>
              <h2>Bienvenido de vuelta</h2>
              <p>Inicia sesion para continuar tu camino de aprendizaje</p>
            </div>

            {/* Role selector */}
            <div className="role-selector">
              <button
                className={`role-selector-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                <User size={16} />
                Estudiante
              </button>
              <button
                className={`role-selector-btn ${role === 'teacher' ? 'active' : ''}`}
                onClick={() => setRole('teacher')}
              >
                <GraduationCap size={16} />
                Docente
              </button>
              <button
                className={`role-selector-btn ${role === 'parent' ? 'active' : ''}`}
                onClick={() => setRole('parent')}
              >
                <Heart size={16} />
                Padre
              </button>
            </div>

            {/* Mode toggle */}
            <div className="login-mode-toggle">
              <button
                className={`mode-btn ${!magicMode ? 'active' : ''}`}
                onClick={() => { setMagicMode(false); setMagicSent(false) }}
              >
                Contraseña
              </button>
              <button
                className={`mode-btn ${magicMode ? 'active' : ''}`}
                onClick={() => { setMagicMode(true); setMagicSent(false) }}
              >
                Acceso por correo
              </button>
            </div>

            {magicSent ? (
              <div className="magic-sent-box">
                <div className="magic-sent-icon"><Mail size={32} /></div>
                <h3>Revisa tu correo</h3>
                <p>Enviamos un enlace de acceso a <strong>{email}</strong>. El enlace expira en 10 minutos.</p>
                <button className="link-btn" onClick={() => setMagicSent(false)}>Volver al inicio de sesión</button>
              </div>
            ) : (
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

                {!magicMode && (
                  <div className="input-group">
                    <label htmlFor="password">Contraseña</label>
                    <div className="input-icon-wrap">
                      <Lock size={16} className="input-icon" />
                      <input
                        id="password" type={show ? 'text' : 'password'} className="input-field with-icon pr"
                        placeholder="Mínimo 8 caracteres"
                        value={password} onChange={e => setPassword(e.target.value)}
                      />
                      <button type="button" className="eye-btn" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                )}

                {error && <div className="form-error" role="alert">{error}</div>}

                <button
                  type="submit"
                  className={`btn btn-primary btn-lg full-w ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? <span className="spinner"/> : magicMode
                    ? <><Send size={16}/> Enviar enlace de acceso</>
                    : <><ArrowRight size={18}/> Iniciar sesión</>
                  }
                </button>

                <div className="form-divider"><span>o accede con</span></div>
                <div className="oauth-row">
                  <button type="button" className="oauth-btn" style={{ width: '100%', justifyContent: 'center' }}>
                    <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google"/>
                    Continuar con Google
                  </button>
                </div>
              </form>
            )}

            <div className="form-footer">
              <button className="link-btn" onClick={() => navigate('/register')}>
                <Sparkles size={14}/> Crear cuenta nueva
              </button>
              <button className="link-btn muted" onClick={() => navigate('/forgot-password')}>
                Olvidé mi contraseña
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
