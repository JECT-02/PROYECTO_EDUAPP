import { useLocation, useNavigate } from 'react-router-dom'
import { Trophy, ArrowRight, RefreshCcw } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'

export default function QuizResult() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { score = 0, total = 0, courseId = '1' } = state || {}

  return (
    <PageWrapper className="center-all">
      <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
        <Trophy size={64} color="var(--accent)" style={{ marginBottom: 24 }} />
        <h1 style={{ marginBottom: 8 }}>¡Quiz Completado!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Has obtenido {score} de {total} puntos.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate(`/roadmap/${courseId}`)}>
            Continuar camino <ArrowRight size={18}/>
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <RefreshCcw size={16}/> Reintentar
          </button>
        </div>
      </div>
    </PageWrapper>
  )
}
