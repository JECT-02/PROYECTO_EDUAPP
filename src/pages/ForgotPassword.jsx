import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'No se pudo enviar el correo de recuperación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper className="center-all">
      <div className="login-form-wrap card" style={{ maxWidth: 400, width: '100%', padding: 40 }}>
        {!sent ? (
          <>
            <div className="form-header" style={{ textAlign: 'center', marginBottom: 32 }}>
              <button className="icon-btn sm" onClick={() => navigate('/login')} style={{ position: 'absolute', left: 24, top: 40 }}>
                <ArrowLeft size={18} />
              </button>
              <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Recuperar acceso</h2>
              <p style={{ color: 'var(--text-muted)' }}>Ingresa tu correo para recibir instrucciones de recuperación</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="input-group">
                <label>Correo electrónico</label>
                <div className="input-icon-wrap">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email" className="input-field with-icon"
                    placeholder="tu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={`btn btn-primary btn-lg full-w ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading ? <span className="spinner"/> : <><Send size={18}/> Enviar instrucciones</>}
              </button>

              {error && (
                <div className="form-error" role="alert" style={{ marginTop: 8 }}>
                  {error}
                </div>
              )}
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: 'var(--success)', marginBottom: 24 }}>
              <CheckCircle size={64} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ marginBottom: 12 }}>Correo enviado</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
              Hemos enviado un enlace a <strong>{email}</strong> para que puedas restablecer tu contraseña.
            </p>
            <button className="btn btn-primary full-w" onClick={() => navigate('/login')}>
              Volver al Login
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
