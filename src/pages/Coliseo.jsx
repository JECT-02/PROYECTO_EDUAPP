import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShieldAlert, Swords, X, Trophy, ArrowRight, Clock, RotateCcw, Home } from 'lucide-react'
import Mascot from '../components/Mascot'
import { initAudio, playCorrect, playIncorrect, playVictory } from '../utils/sounds'
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
  const [defeat, setDefeat] = useState(false)
  const [timeLeft, setTimeLeft] = useState(1800) // 30 min in seconds
  const timerRef = useRef(null)

  const currentQ = QUESTIONS[qIndex]

  // Timer countdown
  useEffect(() => {
    if (!started || victory || defeat) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setDefeat(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [started, victory, defeat])

  // Reset timer on start
  useEffect(() => {
    if (started) {
      setTimeLeft(1800)
    }
  }, [started])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const timerColor = timeLeft <= 60 ? '#EF4444' : timeLeft <= 300 ? '#F59E0B' : '#A7A9BE'

  if (victory) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div className="coliseo-intro animate-scaleIn">
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

  if (defeat) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div className="coliseo-intro animate-scaleIn" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: '5rem', marginBottom: 16 }}>😢</div>
          <h1 style={{ fontSize: '2.5rem', color: '#EF4444' }}>Derrota</h1>
          <p style={{ fontSize: '1.1rem', marginBottom: 8, color: '#A7A9BE' }}>
            {timeLeft === 0
              ? 'Se acabó el tiempo. No te rindas, el conocimiento llega con práctica.'
              : 'Has perdido todas tus vidas. Cada error es una oportunidad para aprender.'}
          </p>
          <p style={{ fontSize: '0.95rem', marginBottom: 32, color: '#6B6D8A' }}>
            {timeLeft === 0
              ? 'Intenta de nuevo, la próxima vez lo lograrás.'
              : 'Vuelve a repasar los temas y regresa más fuerte.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => { setDefeat(false); setStarted(false); setLives(3); setQIndex(0); setStatus('idle'); setTimeLeft(1800) }}>
              <RotateCcw size={16} /> Reintentar
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              <Home size={16} /> Ir al Inicio
            </button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!started) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div className="coliseo-intro">
          <button className="icon-btn close-arena" onClick={() => navigate('/dashboard')} title="Salir del Coliseo">
            <X size={20} />
          </button>
          <div className="coliseo-icon-epic animate-pulse-glow-gold">👑</div>
          <h1 className="gradient-text">Coliseo de Retos</h1>
          <p>Examen Final: Biología Celular</p>
          <ul className="coliseo-rules">
            <li><Swords size={16}/> {QUESTIONS.length} preguntas</li>
            <li><ShieldAlert size={16}/> 30 minutos. NO se puede pausar.</li>
            <li><Heart size={16} color="#EF4444"/> 3 Vidas. Cada error resta una.</li>
          </ul>
          <div className="coliseo-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Volver al dashboard</button>
            <button className="btn btn-accent btn-lg" onClick={() => { initAudio(); setStarted(true) }}>¡Entrar a la Arena!</button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  function handleSelect(option) {
    if (status !== 'idle') return
    if (option === currentQ.a) {
      playCorrect()
      setStatus('correct')
      setTimeout(() => {
        if (qIndex + 1 < QUESTIONS.length) { 
          setQIndex(qIndex + 1)
          setStatus('idle') 
        } else {
          playVictory()
          setVictory(true)
        }
      }, 1000)
    } else {
      playIncorrect()
      setStatus('incorrect')
      const newLives = lives - 1
      setLives(newLives)
      setTimeout(() => {
        if (newLives <= 0) {
          setDefeat(true)
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
        <div className="coliseo-timer" style={{ color: timerColor }}>
          <Clock size={16} style={{ marginRight: 6 }} />
          {formatTime(timeLeft)}
        </div>
        <div className="coliseo-lives">
          {Array.from({length: 3}).map((_, i) => (
             <Heart key={i} size={24} fill={i < lives ? '#EF4444' : 'transparent'} color={i < lives ? '#EF4444' : '#6B6D8A'} />
          ))}
        </div>
      </header>

      <main className="coliseo-main">
        <div className="coliseo-arena">
          <Mascot type="dragon" mood={status==='incorrect'?'sad':status==='correct'?'happy':'normal'} size="lg" />
          <div className="coliseo-q-card">
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
