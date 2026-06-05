import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, BookOpen, Hash, Sparkles } from 'lucide-react'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import { listPublishedCourses, enrollStudent, isSupabaseConfigured } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import './Explore.css'

const COLOR_POOL = ['#6C63FF', '#F59E0B', '#22C55E', '#EC4899', '#3B82F6', '#8B5CF6', '#10B981']
const EMOJI_POOL = ['⚛️', '🎨', '🤖', '📚', '🧪', '🌍', '🧠', '🎼']

export default function Explore() {
  const navigate = useNavigate()
  const { studentId } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [search, setSearch] = useState('')
  const [enrolling, setEnrolling] = useState(null)
  const [enrollError, setEnrollError] = useState('')
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await listPublishedCourses({ search })
      if (cancelled) return
      setCatalog((data || []).map((c, i) => ({
        id: c.id,
        title: c.title,
        teacher: c.profiles?.full_name || 'Docente',
        level: c.level || 'Todos',
        tags: c.category ? [c.category] : [],
        emoji: EMOJI_POOL[i % EMOJI_POOL.length],
        color: COLOR_POOL[i % COLOR_POOL.length],
        invite_token: c.invite_token,
      })))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [search])

  async function handleEnroll(token) {
    if (!isSupabaseConfigured || !studentId) {
      setEnrollError('Debes iniciar sesión como estudiante para inscribirte.')
      return
    }
    setEnrolling(token)
    setEnrollError('')
    const { data, error } = await enrollStudent({ studentId, inviteToken: token })
    setEnrolling(null)
    if (error) {
      setEnrollError(error.message || 'No se pudo inscribir.')
      return
    }
    navigate(`/roadmap/${data.course_id}`)
  }

  return (
    <PageWrapper>
      <Header />
      <div className="explore-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="explore-title">Explorar Catálogo</h1>
          <button className="btn btn-primary" onClick={() => setInviteModal(true)}>
            <Hash size={16} /> Inscribirme con código
          </button>
        </div>

        <div className="explore-toolbar">
          <div className="input-icon-wrap" style={{ flex: 1, maxWidth: 400 }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="input-field with-icon"
              placeholder="Buscar cursos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost"><Filter size={16}/> Filtros</button>
        </div>

        {enrollError && (
          <div className="form-error" role="alert" style={{ marginBottom: 12 }}>{enrollError}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Sparkles size={20} className="animate-spin" /> Cargando cursos...
          </div>
        ) : catalog.length === 0 ? (
          <div className="empty-state card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No hay cursos publicados todavía. Pide a tu docente el código de invitación.</p>
          </div>
        ) : (
          <div className="explore-grid">
            {catalog.map(c => (
              <div key={c.id} className="explore-card" onClick={() => navigate('/dashboard')} style={{ '--course-color': c.color }}>
                <div className="explore-cover" style={{ background: `linear-gradient(135deg, ${c.color}33, ${c.color}11)` }}>
                  {c.emoji}
                </div>
                <div className="explore-body">
                  <div className="explore-tags">
                    {c.tags.map(t => <span key={t} className="badge badge-purple">{t}</span>)}
                    {c.level && c.level !== 'Todos' && <span className="badge badge-blue">{c.level}</span>}
                  </div>
                  <h3 className="explore-card-title">{c.title}</h3>
                  <p className="explore-card-teacher">{c.teacher}</p>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={(e) => { e.stopPropagation(); c.invite_token && handleEnroll(c.invite_token) }}
                    disabled={!c.invite_token || enrolling === c.invite_token}
                  >
                    <BookOpen size={16} /> {enrolling === c.invite_token ? 'Inscribiendo...' : 'Inscribirme'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {inviteModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setInviteModal(false) }}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Inscribirme con código</h2>
              <button className="modal-close-btn" onClick={() => setInviteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Pide a tu docente el código de invitación y pégalo aquí.
              </p>
              <div className="input-group">
                <label>Código de invitación</label>
                <input
                  className="input-field"
                  placeholder="Ej: a3f2b1c4d5e6"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  autoFocus
                />
              </div>
              {enrollError && <div className="form-error" role="alert">{enrollError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setInviteModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!inviteToken.trim() || enrolling}
                onClick={() => handleEnroll(inviteToken.trim())}
              >
                {enrolling ? <span className="spinner" /> : 'Inscribirme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
