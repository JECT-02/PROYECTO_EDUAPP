import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'

export default function QuizResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const score = location.state?.score || 0
  const total = location.state?.total || 2
  const passed = (score / total) >= 0.5

  return (
    <PageWrapper className="quiz-page" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}>
        <Mascot type="dragon" size="lg" mood={passed ? 'happy' : 'sad'} />
        
        <h1 style={{ fontSize: '2rem', margin: '20px 0 8px' }}>
          {passed ? '¡Bien hecho!' : 'Necesitas repasar'}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Has obtenido {score} de {total} respuestas correctas.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
          {Array.from({length: total}).map((_, i) => (
            <div key={i} style={{ color: i < score ? 'var(--success)' : 'var(--error)' }}>
              {i < score ? <CheckCircle size={32}/> : <XCircle size={32}/>}
            </div>
          ))}
        </div>

        {passed ? (
          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/roadmap')}>
            Continuar camino <ArrowRight size={18}/>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/review')}>
              Ver Corrección y Refuerzo
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/quiz')}>
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
