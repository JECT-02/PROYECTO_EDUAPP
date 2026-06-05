import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, X, RefreshCw, Sparkles, BookOpen, Zap, Trophy, Puzzle, AlertCircle } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { listPendingReviewNodes, updateNode, isSupabaseConfigured } from '../lib/api'
import { generateLesson, generateQuiz, generateColiseo } from '../lib/llm'
import { sanitizeHtml } from '../lib/sanitize'
import './ContentReview.css'

const TYPE_ICON = {
  theory: <BookOpen size={18} />,
  practice: <Puzzle size={18} />,
  quiz: <Zap size={18} />,
  boss: <Trophy size={18} />,
  reward: <Sparkles size={18} />,
}

export default function ContentReview() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    if (!user?.id) return
    setLoading(true)
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    const { data } = await listPendingReviewNodes(user.id)
    setPending((data || []).filter((n) => !courseId || n.course_id === courseId))
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id, courseId])

  async function handleApprove(node) {
    setBusyId(node.id)
    setError('')
    const { error: e } = await updateNode(node.id, { status: 'published' })
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setPending((prev) => prev.filter((n) => n.id !== node.id))
  }

  async function handleReject(node) {
    if (!window.confirm('¿Rechazar este nodo y eliminarlo del roadmap?')) return
    setBusyId(node.id)
    const { error: e } = await updateNode(node.id, { status: 'archived' })
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setPending((prev) => prev.filter((n) => n.id !== node.id))
  }

  async function handleRegenerate(node) {
    setBusyId(node.id)
    setError('')
    try {
      if (node.type === 'theory') {
        await generateLesson({ courseId: node.course_id, nodeId: node.id })
      } else if (node.type === 'quiz') {
        await generateQuiz({ courseId: node.course_id, nodeId: node.id, count: 4 })
      } else if (node.type === 'boss') {
        await generateColiseo({ courseId: node.course_id, count: 10 })
      }
      await load()
    } catch (e) {
      setError(e.message || 'Error al regenerar')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageWrapper>
      <Header />
      <div className="cr-page">
        <div className="cr-header">
          <button className="icon-btn" onClick={() => navigate('/teacher')} aria-label="Volver">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="cr-title">Revisión de contenido IA</h1>
            <p className="cr-sub">
              {pending.length} nodo{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''} de aprobación
            </p>
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Sparkles size={20} className="animate-spin" /> Cargando...
          </div>
        ) : pending.length === 0 ? (
          <div className="empty-state card" style={{ padding: 40, textAlign: 'center' }}>
            <Check size={32} color="#22C55E" style={{ margin: '0 auto 12px' }} />
            <h3>¡Todo revisado!</h3>
            <p style={{ color: 'var(--text-muted)' }}>No hay nodos pendientes de aprobación. La IA aún no ha generado contenido nuevo, o ya has revisado todo.</p>
          </div>
        ) : (
          <div className="cr-grid">
            {pending.map((node) => (
              <div key={node.id} className="cr-card">
                <div className="cr-card-head">
                  <div className="cr-type" data-type={node.type}>
                    {TYPE_ICON[node.type] || <BookOpen size={18} />}
                    <span>{node.type}</span>
                  </div>
                  <div className="cr-course">
                    {node.courses?.title || 'Curso'}
                  </div>
                </div>
                <h3 className="cr-node-title">{node.title}</h3>
                {node.description && (
                  <p className="cr-node-desc">{node.description}</p>
                )}
                {node.content && (
                  <div
                    className="cr-content-preview"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewText(node.content)) }}
                  />
                )}
                <div className="cr-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleApprove(node)}
                    disabled={busyId === node.id}
                  >
                    <Check size={14} /> Aprobar
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRegenerate(node)}
                    disabled={busyId === node.id}
                  >
                    <RefreshCw size={14} /> Regenerar con IA
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(node)}
                    disabled={busyId === node.id}
                  >
                    <X size={14} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

function previewText(text, max = 400) {
  const t = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max) + '…' : t
}
