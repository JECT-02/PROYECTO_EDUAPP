import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight, RefreshCcw, BookOpen, CheckCircle2, XCircle, LoaderCircle } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { vibrateWarning } from '../utils/vibration'
import { getCourseNodes } from '../lib/api'
import './QuizResult.css'

export default function QuizResult() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const {
    score = 0,
    total = 0,
    courseId = '1',
    nodeId = '1',
    answers = [],
    congratulations = ''
  } = state || {}

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0
  const passed = percentage >= 60
  const incorrectCount = answers.filter(a => !a.isCorrect).length
  const [nextNodePath, setNextNodePath] = useState(null)
  const [loadingNext, setLoadingNext] = useState(true)

  // Find next node for navigation
  useEffect(() => {
    let cancelled = false
    async function loadNext() {
      try {
        const { data: nodes } = await getCourseNodes(courseId)
        if (cancelled || !nodes) return
        const sorted = [...nodes].sort((a, b) => a.position - b.position)
        const cur = sorted.find(n => String(n.position) === String(nodeId) || String(n.id) === String(nodeId))
        const curPos = cur?.position || parseInt(nodeId) || 0
        const next = sorted.find(n => n.position === curPos + 1)
        if (next) {
          const type = next.type
          setNextNodePath((type === 'quiz' || type === 'boss') ? `/quiz/${courseId}/${next.position}` : `/lesson/${courseId}/${next.position}`)
        } else {
          setNextNodePath(`/roadmap/${courseId}`)
        }
      } catch { setNextNodePath(`/roadmap/${courseId}`) }
      if (!cancelled) setLoadingNext(false)
    }
    loadNext()
    return () => { cancelled = true }
  }, [courseId, nodeId])

  // Vibrate warning if score < 40% (desempeño bajo — ee2.md CU-02)
  useEffect(() => {
    if (percentage < 40) {
      vibrateWarning()
    }
  }, [percentage])

  return (
    <PageWrapper className="center-all">
      <div className="quiz-result-card" aria-live="polite" aria-atomic="true">
        {/* Icon */}
        <div className="result-icon" aria-hidden="true">
          {passed ? (
            <CheckCircle2 size={64} color="var(--success)" />
          ) : (
            <XCircle size={64} color="var(--error)" />
          )}
        </div>

        {/* Title */}
        <h1 className="result-title">
          {passed ? (congratulations || '¡Bien hecho!') : 'Necesitas repasar'}
        </h1>

        {/* Congratulations message for boss */}
        {passed && congratulations && (
          <p className="result-congratulations" style={{ color: 'var(--success)', textAlign: 'center', marginBottom: 16 }}>
            {congratulations}
          </p>
        )}

        {/* Score */}
        <p className="result-sub">
          Obtuviste{' '}
          <strong className="result-score" style={{ color: passed ? 'var(--success)' : 'var(--error)' }}>
            {score}
          </strong>
          {' '}de {total}
        </p>

        {/* Score ring */}
        <div className="score-ring" style={{
          background: `conic-gradient(${passed ? 'var(--success)' : 'var(--error)'} ${percentage}%, rgba(255,255,255,0.04) ${percentage}%)`
        }}>
          <div className="score-ring-inner">
            {percentage}%
          </div>
        </div>

        {/* Summary */}
        {answers.length > 0 && (
          <p className="result-summary">
            {incorrectCount > 0
              ? `${incorrectCount} pregunta${incorrectCount !== 1 ? 's' : ''} con error${incorrectCount !== 1 ? 'es' : ''}`
              : '¡Respuestas perfectas!'}
          </p>
        )}

        {/* Actions */}
        <div className="result-actions">
          {loadingNext ? (
            <div className="btn btn-primary btn-lg" style={{ opacity: 0.6, cursor: 'default', display: 'flex', alignItems: 'center', gap: 8 }}>
              <LoaderCircle size={18} className="animate-spin" /> Cargando...
            </div>
          ) : passed ? (
            <button className="btn btn-primary btn-lg" onClick={() => nextNodePath && navigate(nextNodePath)}>
              Siguiente nodo <ArrowRight size={18}/>
            </button>
          ) : (
            <>
              <button className="btn btn-accent btn-lg" onClick={() => navigate(`/review/${courseId}/${nodeId}`, { state: { answers, score, total } })}>
                <BookOpen size={18}/> Revisar errores
              </button>
              <button className="btn btn-ghost" onClick={() => navigate(-1)}>
                <RefreshCcw size={16}/> Intentar de nuevo
              </button>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
