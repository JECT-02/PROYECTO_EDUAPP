import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Send, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState(null)
  const [magicMode, setMagicMode] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [connOk, setConnOk] = useState(null) // null = unknown, true/false
  const [connChecking, setConnChecking] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    if (!isSupabaseConfigured || !supabase) {
      setConnOk(false)
      return
    }
    setConnChecking(true)
    try {
      // /auth/v1/settings devuelve 200 con la apikey anon correcta.
      // Si la URL es incorrecta, devuelve 404/Network error; si el proyecto
      // esta pausado, devuelve 401/403.
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${url}/auth/v1/settings`, {
        method: 'GET',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      setConnOk(res.ok)
    } catch {
      setConnOk(false)
    } finally {
      setConnChecking(false)
    }
  }

  function friendlyError(err) {
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
      return {
        kind: 'creds',
        text: 'Correo o contraseña incorrectos. Intenta de nuevo.',
      }
    }
    if (msg.includes('email not confirmed')) {
      return {
        kind: 'unconfirmed',
        text: 'Tu correo aún no está verificado. Revisa tu bandeja de entrada.',
      }
    }
    if (msg.includes('user not found') || msg.includes('no existe')) {
      return {
        kind: 'notfound',
        text: 'No existe una cuenta con ese correo. Crea una cuenta nueva o usa el correo correcto.',
      }
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return {
        kind: 'ratelimit',
        text: 'Demasiados intentos. Espera un minuto antes de reintentar.',
      }
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return {
        kind: 'network',
        text: 'No se pudo conectar al servidor. Revisa tu conexión a internet y que la URL de Supabase sea correcta.',
      }
    }
    if (msg.includes('supabase no está configurado')) {
      return {
        kind: 'config',
        text: 'La aplicación no está configurada. Completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env y reinicia el servidor de desarrollo.',
      }
    }
    return { kind: 'unknown', text: err?.message || 'No se pudo iniciar sesión. Verifica tus credenciales e inténtalo de nuevo.' }
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || (!magicMode && !password)) {
      setError('Completa todos los campos')
      setErrorKind('validation')
      return
    }
    setLoading(true); setError(''); setErrorKind(null)
    try {
      const res = await login({ email, password, magicLink: magicMode })
      if (res?.magicSent) {
        setMagicSent(true)
        setLoading(false)
        return
      }
      setLoading(false)
    } catch (err) {
      const fe = friendlyError(err)
      setError(fe.text)
      setErrorKind(fe.kind)
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

            {/* Indicador de conexion a Supabase */}
            {connOk === false && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
                fontSize: '0.78rem',
                color: '#FCA5A5',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>No se pudo conectar a Supabase. Verifica VITE_SUPABASE_URL en .env.</span>
                <button
                  type="button"
                  onClick={checkConnection}
                  style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}
                  title="Reintentar"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
            {connChecking && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} className="animate-spin" /> Verificando conexion con Supabase...
              </div>
            )}

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

                {error && (
                  <div className="form-error" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </div>
                    {errorKind === 'creds' && (
                      <button
                        type="button"
                        className="link-btn"
                        style={{ fontSize: '0.78rem', color: 'var(--primary-light)', textAlign: 'left', padding: 0 }}
                        onClick={() => navigate('/forgot-password')}
                      >
                        ¿Olvidaste la contraseña? Restablécela aquí.
                      </button>
                    )}
                  </div>
                )}

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
