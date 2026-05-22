import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShieldAlert, Swords, X, Trophy, ArrowRight } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Coliseo.css'

const QUESTIONS = [
  { q: "¿Qué estructura celular es análoga a una central de procesamiento de empaques?", a: "Aparato de Golgi", options: ["El Núcleo", "Aparato de Golgi", "Lisosoma"] },
  { q: "¿Cuál es la principal función de la mitocondria?", a: "Producción de energía (ATP)", options: ["Síntesis de proteínas", "Producción de energía (ATP)", "Fotosíntesis"] },
  { q: "¿Qué componente delimita la célula del exterior?", a: "Membrana Plasmática", options: ["Citoplasma", "Pared Celular", "Membrana Plasmática"] },
  { q: "¿Dónde se encuentra el material genético en una célula eucariota?", a: "Núcleo", options: ["Ribosomas", "Núcleo", "Vacuola"] },
  { q: "¿Qué orgánulo es responsable de la fotosíntesis en plantas?", a: "Cloroplasto", options: ["Cloroplasto", "Mitocondria", "Leucoplasto"] }
]

export default function Coliseo() {
  const navigate = useNavigate()
  const [started, setStarted] = useState(false)
  const [lives, setLives] = useState(3)
  const [qIndex, setQIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [victory, setVictory] = useState(false)

  const currentQ = QUESTIONS[qIndex]

  if (victory) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div className="card coliseo-intro animate-scaleIn">
          <Trophy size={80} color="#FACC15" className="animate-bounce" style={{ margin: '0 auto 24px' }} />
          <h1 className="gradient-text" style={{ fontSize: '2.5rem' }}>¡MAESTRÍA LOGRADA!</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: 32 }}>Has superado el Coliseo de Retos con éxito.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
            Volver al Inicio <ArrowRight size={20}/>
          </button>
        </div>
      </PageWrapper>
    )
  }

  if (!started) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div className="card coliseo-intro">
          <button className="icon-btn close-arena" onClick={() => navigate('/dashboard')} title="Salir del Coliseo">
            <X size={20} />
          </button>
          <div className="coliseo-icon-epic animate-pulse-glow">👑</div>
          <h1 className="gradient-text">Coliseo de Retos</h1>
          <p>Examen Final: Biología Celular</p>
          <ul className="coliseo-rules">
            <li><Swords size={16}/> {QUESTIONS.length} preguntas adaptativas</li>
            <li><ShieldAlert size={16}/> 30 minutos. NO se puede pausar.</li>
            <li><Heart size={16} color="#EF4444"/> 3 Vidas. Cada error resta una.</li>
          </ul>
          <div className="coliseo-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Volver al dashboard</button>
            <button className="btn btn-accent btn-lg" onClick={() => setStarted(true)}>¡Entrar a la Arena!</button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  function handleSelect(option) {
    if (status !== 'idle') return
    if (option === currentQ.a) {
      setStatus('correct')
      setTimeout(() => {
        if (qIndex + 1 < QUESTIONS.length) { 
          setQIndex(qIndex + 1)
          setStatus('idle') 
        } else {
          setVictory(true)
        }
      }, 1000)
    } else {
      setStatus('incorrect')
      const newLives = lives - 1
      setLives(newLives)
      setTimeout(() => {
        if (newLives <= 0) {
          navigate('/dashboard') // Defeat: Back to dashboard
        } else {
          setQIndex(qIndex + 1 < QUESTIONS.length ? qIndex + 1 : qIndex)
          setStatus('idle')
          if (qIndex + 1 >= QUESTIONS.length) setVictory(true) // Ended with mistakes but still lives
        }
      }, 1000)
    }
  }

  return (
    <PageWrapper className="coliseo-page in-game">
      <header className="coliseo-header">
        <button className="icon-btn exit-btn" onClick={() => navigate('/dashboard')} title="Abandonar arena">
          <X size={18} />
        </button>
        <div className="coliseo-progress">Ronda {qIndex + 1} / {QUESTIONS.length}</div>
        <div className="coliseo-timer">29:55</div>
        <div className="coliseo-lives">
          {Array.from({length: 3}).map((_, i) => (
             <Heart key={i} size={24} fill={i < lives ? '#EF4444' : 'transparent'} color={i < lives ? '#EF4444' : '#6B6D8A'} />
          ))}
        </div>
      </header>

      <main className="coliseo-main">
        <div className="coliseo-arena">
          <Mascot type="dragon" mood={status==='incorrect'?'sad':status==='correct'?'happy':'normal'} size="lg" />
          <div className="card coliseo-q-card">
            <h2>{currentQ.q}</h2>
            <div className="quiz-options">
              {currentQ.options.map((opt, i) => (
                <button 
                  key={i}
                  className={`quiz-opt-btn ${status === 'correct' && opt === currentQ.a ? 'correct' : ''} ${status === 'incorrect' && opt !== currentQ.a ? 'disabled' : ''}`} 
                  onClick={() => handleSelect(opt)}
                >
                  <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </PageWrapper>
  )
}
