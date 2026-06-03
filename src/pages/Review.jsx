import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, MessageSquare, ExternalLink, Play, CheckCircle2, XCircle } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Review.css'

export default function Review() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { state } = useLocation()
  const [hubOpen, setHubOpen] = useState(false)
  const [analogyType, setAnalogyType] = useState('Como si tuviera 5 años')
  const [currentIndex, setCurrentIndex] = useState(0)

  // Receive answers from router state, fallback to empty array
  const answers = state?.answers || []
  const incorrectAnswers = answers.filter(a => !a.isCorrect)

  // If no data, show empty state
  if (answers.length === 0) {
    return (
      <PageWrapper className="review-page">
        <header className="review-header">
          <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
          <h1 className="review-title">Corrección</h1>
          <div style={{width: 38}} />
        </header>
        <main className="review-content">
          <div className="review-container" style={{ textAlign: 'center', paddingTop: 60 }}>
            <Mascot type="owl" size="md" mood="normal" message="No hay respuestas para revisar. ¡Completa un quiz primero!" />
            <button className="btn btn-primary btn-lg" style={{ marginTop: 24 }} onClick={() => navigate('/dashboard')}>
              Ir al inicio
            </button>
          </div>
        </main>
      </PageWrapper>
    )
  }

  const currentAnswer = incorrectAnswers[currentIndex] || answers.find(a => !a.isCorrect) || answers[0]
  const totalIncorrect = incorrectAnswers.length

  function handleNext() {
    setHubOpen(false)
    if (currentIndex < totalIncorrect - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      navigate(`/roadmap/${courseId}`)
    }
  }

  function handleEntendido() {
    if (currentIndex < totalIncorrect - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      navigate(`/roadmap/${courseId}`)
    }
  }

  // If no incorrect answers, show congrats
  if (totalIncorrect === 0) {
    return (
      <PageWrapper className="review-page">
        <header className="review-header">
          <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
          <h1 className="review-title">Corrección</h1>
          <div style={{width: 38}} />
        </header>
        <main className="review-content">
          <div className="review-container" style={{ textAlign: 'center', paddingTop: 60 }}>
            <CheckCircle2 size={64} color="var(--success)" style={{ marginBottom: 16 }} />
            <h2 style={{ marginBottom: 12 }}>¡Sin errores!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Respondiste todas las preguntas correctamente.</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/roadmap/${courseId}`)}>
              Continuar camino <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }}/>
            </button>
          </div>
        </main>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="review-page">
      <header className="review-header">
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 className="review-title">Corrección</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {currentIndex + 1} / {totalIncorrect}
        </span>
      </header>

      <main className="review-content">
        <div className="review-container">
          {/* Question context */}
          <div className="review-q-card" tabIndex={0} role="region" aria-label={`Pregunta: ${currentAnswer.question}. Tu respuesta: ${currentAnswer.selected >= 0 ? currentAnswer.options[currentAnswer.selected] : 'No respondiste'}. Respuesta correcta: ${currentAnswer.options[currentAnswer.correct]}`}>
            <div aria-hidden="true">
              <h3 className="rq-title">Pregunta original</h3>
              <p className="rq-text">{currentAnswer.question}</p>
              <div className="rq-answer incorrect">
                <span className="lbl">Tu respuesta:</span>
                <span className="val">
                  {currentAnswer.selected >= 0
                    ? currentAnswer.options[currentAnswer.selected]
                    : '(No respondiste)'}
                </span>
              </div>
              {currentAnswer.options && (
                <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--success)' }}>
                  Respuesta correcta: <strong>{currentAnswer.options[currentAnswer.correct]}</strong>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="ai-analysis-card" tabIndex={0} role="region" aria-label={`Análisis: ${currentAnswer.explanation || 'Revisa el material de clase'}`}>
            <div aria-hidden="true">
              <div className="ai-header">
                <Mascot type="owl" size="sm" mood="normal" />
                <div>
                  <h3 className="ai-title">Análisis</h3>
                  {currentAnswer.explanation && (
                    <span className="ai-concept">
                      {currentAnswer.selected >= 0
                        ? `Confundiste "${currentAnswer.options[currentAnswer.selected]}" con "${currentAnswer.options[currentAnswer.correct]}"`
                        : 'No respondiste a tiempo'}
                    </span>
                  )}
                </div>
              </div>
              <div className="ai-body">
                <p>{currentAnswer.explanation || 'Revisa el material de clase para entender mejor este concepto.'}</p>
              </div>
              <div className="ai-source">
                <BookOpen size={14} /> Fuente: Material de clase del curso
              </div>
            </div>
          </div>

          {!hubOpen ? (
            <div className="review-actions">
              <button className="btn btn-primary btn-lg" onClick={handleEntendido}>
                ¡Entendido! <ArrowLeft style={{transform:'rotate(180deg)'}} size={18}/>
              </button>
              <button className="btn btn-accent btn-lg" onClick={() => setHubOpen(true)}>
                Aún no entiendo
              </button>
            </div>
          ) : (
            /* Hub de Refuerzo Multifuente */
            <div className="hub-card animate-fadeInUp">
              <h2 className="hub-title">Refuerzo</h2>

              <div className="hub-section">
                <h4 className="hub-sub"><MessageSquare size={16}/> 1. Analogía</h4>
                <select
                  className="input-field"
                  value={analogyType}
                  onChange={(e) => setAnalogyType(e.target.value)}
                  aria-label="Analogía. Tipo de analogía"
                  style={{marginBottom: 12}}
                >
                  <option>Explicación estándar</option>
                  <option>Como si tuviera 5 años</option>
                  <option>Con videojuegos</option>
                  <option>Con cocina</option>
                </select>
                <div className="analogy-box" aria-live="polite" aria-atomic="true">
                  {analogyType === 'Como si tuviera 5 años'
                    ? "Imagina que la célula es una ciudad. La mitocondria es la planta de energía que da electricidad a todas las casas. El núcleo es la oficina del alcalde, donde se guardan las reglas de la ciudad."
                    : analogyType === 'Con videojuegos'
                      ? "Piensa en tu consola. La mitocondria es la fuente de poder enchufada a la pared, dando energía. El núcleo es el disco duro con todos los juegos guardados."
                      : analogyType === 'Con cocina'
                        ? "La célula es como una cocina. La mitocondria es la estufa que produce el calor para cocinar (energía). El núcleo es el libro de recetas con las instrucciones."
                        : "La mitocondria es el orgánulo encargado de la respiración celular y producción de ATP. El núcleo contiene el material genético pero no produce energía."}
                </div>
              </div>

              <div className="hub-section">
                <h4 className="hub-sub"><Play size={16}/> 2. Video Recomendado</h4>
                <div className="video-card" tabIndex={0} role="link" aria-label={`Video recomendado. Mitocondrias: Central Energética. Clip: 02:15 a 04:30. Presiona Enter para abrir`} onClick={() => window.open('https://youtube.com', '_blank')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('https://youtube.com', '_blank') } }}>
                  <div className="video-thumb">▶</div>
                  <div className="video-info">
                    <div className="v-title">Mitocondrias: Central Energética</div>
                    <div className="v-time">Clip: 02:15 - 04:30</div>
                  </div>
                  <ExternalLink size={16} color="var(--text-muted)"/>
                </div>
              </div>

              <button className="btn btn-primary full-w" onClick={handleNext}>
                {currentIndex < totalIncorrect - 1 ? 'Siguiente error →' : 'Ahora sí entendí'}
              </button>
            </div>
          )}
        </div>
      </main>
    </PageWrapper>
  )
}
