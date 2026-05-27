import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, RefreshCcw, BookOpen, CheckCircle2, XCircle } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'

export default function QuizResult() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const {
    score = 0,
    total = 0,
    courseId = '1',
    nodeId = '1',
    answers = []
  } = state || {}

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0
  const passed = percentage >= 60
  const incorrectCount = answers.filter(a => !a.isCorrect).length

  return (
    <PageWrapper className="center-all">
      <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 420, width: '100%' }}>
        {/* Icon */}
        {passed ? (
          <CheckCircle2 size={64} color="var(--success)" style={{ marginBottom: 16 }} />
        ) : (
          <XCircle size={64} color="var(--error)" style={{ marginBottom: 16 }} />
        )}

        {/* Title */}
        <h1 style={{ marginBottom: 8 }}>
          {passed ? '¡Bien hecho!' : 'Necesitas repasar'}
        </h1>

        {/* Score */}
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
          Obtuviste{' '}
          <strong style={{ color: passed ? 'var(--success)' : 'var(--error)', fontSize: '1.4rem' }}>
            {score}
          </strong>
          {' '}de {total}
        </p>

        {/* Score ring */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%', margin: '20px auto 28px',
          background: `conic-gradient(${passed ? 'var(--success)' : 'var(--error)'} ${percentage}%, var(--surface-3) ${percentage}%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--glass)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.4rem'
          }}>
            {percentage}%
          </div>
        </div>

        {/* Summary */}
        {answers.length > 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 28 }}>
            {incorrectCount > 0
              ? `${incorrectCount} pregunta${incorrectCount !== 1 ? 's' : ''} con error${incorrectCount !== 1 ? 'es' : ''}`
              : '¡Respuestas perfectas!'}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {passed ? (
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/roadmap/${courseId}`)}>
              Continuar camino <ArrowRight size={18}/>
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
