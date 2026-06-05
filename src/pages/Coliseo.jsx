import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShieldAlert, Swords, X, Trophy, ArrowRight, Clock, RotateCcw, Home, Mic, AlertCircle } from 'lucide-react'
import Mascot from '../components/Mascot'
import { initAudio, playCorrect, playIncorrect, playVictory } from '../utils/sounds'
import { vibrateCorrect, vibrateIncorrect, vibrateVictory } from '../utils/vibration'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/api'
import { analyzeError } from '../lib/llm'
import { recordWeakness } from '../lib/api'
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
  const { studentId } = useAuth()
  const [started, setStarted] = useState(false)
  const [lives, setLives] = useState(3)
  const [qIndex, setQIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [selected, setSelected] = useState(null)
  const [victory, setVictory] = useState(false)
  const [defeat, setDefeat] = useState(false)
  const [timeLeft, setTimeLeft] = useState(1800) // 30 min in seconds
  const [errorHint, setErrorHint] = useState('')
  const timerRef = useRef(null)
  const [quizAnnouncement, setQuizAnnouncement] = useState('')
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState('')
  const [timeAnnouncement, setTimeAnnouncement] = useState('')
  const optionsRef = useRef(null)
  const focusTimerRef = useRef(null)

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

  // Announce question + lives + time
  useEffect(() => {
    if (!started || victory || defeat) return
    const t = timeLeft
    const mins = Math.floor(t / 60)
    const timeStr = mins >= 1 ? `${mins} minutos` : `${t} segundos`
    setQuizAnnouncement(`${timeStr}. ${lives} vidas restantes. ${currentQ.q}`)
    setFeedbackAnnouncement('')
  }, [qIndex, started, victory, defeat, currentQ])  // lives se lee del closure al renderizar

  // Auto-focus first option AFTER the aria-live announcement renders
  useEffect(() => {
    if (!started || victory || defeat || !quizAnnouncement) return
    // Small delay so NVDA reads the aria-live announcement before focus moves
    focusTimerRef.current = setTimeout(() => {
      const firstBtn = optionsRef.current?.querySelector('.quiz-opt-btn')
      firstBtn?.focus()
    }, 800)
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
    }
  }, [quizAnnouncement, started, victory, defeat])

  // Announce result
  useEffect(() => {
    if (status === 'correct') {
      setFeedbackAnnouncement('¡Correcto!')
    } else if (status === 'incorrect') {
      const correctIndex = currentQ.options.indexOf(currentQ.a)
      setFeedbackAnnouncement(`Incorrecto. La respuesta correcta era ${String.fromCharCode(65 + correctIndex)}.`)
    }
  }, [status, currentQ])

  // Announce victory / defeat
  useEffect(() => {
    if (victory) {
      setFeedbackAnnouncement('¡Maestría lograda! Has superado el Coliseo de Retos con éxito.')
      setQuizAnnouncement('')
      setTimeAnnouncement('')
    } else if (defeat) {
      const msg = timeLeft === 0
        ? 'Derrota. Se acabó el tiempo. No te rindas, el conocimiento llega con práctica.'
        : 'Derrota. Has perdido todas tus vidas. Vuelve a repasar los temas y regresa más fuerte.'
      setFeedbackAnnouncement(msg)
      setQuizAnnouncement('')
      setTimeAnnouncement('')
    }
  }, [victory, defeat])  // timeLeft se lee del closure al renderizar

  // Announce time warnings
  useEffect(() => {
    if (timeLeft === 1200) setTimeAnnouncement('Quedan 20 minutos')
    else if (timeLeft === 600) setTimeAnnouncement('Quedan 10 minutos')
    else if (timeLeft === 300) setTimeAnnouncement('Quedan 5 minutos')
    else if (timeLeft === 60) setTimeAnnouncement('Queda 1 minuto')
    else if (timeLeft === 10) setTimeAnnouncement('Quedan 10 segundos')
  }, [timeLeft])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const timerColor = timeLeft <= 60 ? '#EF4444' : timeLeft <= 300 ? '#F59E0B' : '#A7A9BE'

  async function triggerAnalysis(questionObj, userAnswer) {
    if (!isSupabaseConfigured) return
    setErrorHint('')
    try {
      const concept = questionObj.q.split(' ').slice(0, 4).join(' ')
      const { explanation } = await analyzeError({
        question: questionObj.q,
        userAnswer,
        correctAnswer: questionObj.a,
        concept,
      })
      if (explanation) setErrorHint(explanation)
      if (studentId) {
        await recordWeakness({
          studentId,
          concept,
          isError: true,
        })
      }
    } catch { /* silent */ }
  }

  function handleSelect(option) {
    if (status !== 'idle') return
    setSelected(option)
    if (option === currentQ.a) {
      playCorrect()
      vibrateCorrect()
      setStatus('correct')
      setTimeout(() => {
        if (qIndex + 1 < QUESTIONS.length) {
          setQIndex(qIndex + 1)
          setSelected(null)
          setStatus('idle')
          setErrorHint('')
        } else {
          playVictory()
          vibrateVictory()
          setVictory(true)
        }
      }, 1000)
    } else {
      playIncorrect()
      vibrateIncorrect()
      setStatus('incorrect')
      const newLives = lives - 1
      setLives(newLives)
      triggerAnalysis(currentQ, option).catch(() => { /* noop */ })
      setTimeout(() => {
        if (newLives <= 0) {
          setDefeat(true)
        } else {
          setQIndex(qIndex + 1 < QUESTIONS.length ? qIndex + 1 : qIndex)
          setSelected(null)
          setStatus('idle')
          if (qIndex + 1 >= QUESTIONS.length) setVictory(true)
        }
      }, 1000)
    }
  }

  // Determine page class
  let pageClass = 'coliseo-page'
  if (started && !victory && !defeat) pageClass += ' in-game'
  else if (!started) pageClass += ' center-all'
  else pageClass += ' center-all'

  return (
    <PageWrapper className={pageClass}>
      {/* ====== SIEMPRE MONTADOS: regiones aria-live para NVDA ====== */}
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">{quizAnnouncement}</div>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">{feedbackAnnouncement}</div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{timeAnnouncement}</div>

      {/* ====== VICTORIA ====== */}
      {victory && (
        <div className="coliseo-intro animate-scaleIn">
          <Trophy size={80} color="#FACC15" className="animate-bounce" style={{ margin: '0 auto 24px' }} />
          <h1 className="gradient-text" style={{ fontSize: '2.5rem' }}>¡MAESTRÍA LOGRADA!</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: 32 }}>Has superado el Coliseo de Retos con éxito.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
            Volver al Inicio <ArrowRight size={20}/>
          </button>
        </div>
      )}

      {/* ====== DERROTA ====== */}
      {defeat && (
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
            <button className="btn btn-ghost" onClick={() => { setDefeat(false); setStarted(false); setLives(3); setQIndex(0); setStatus('idle'); setTimeLeft(1800); setQuizAnnouncement(''); setFeedbackAnnouncement(''); setTimeAnnouncement('') }}>
              <RotateCcw size={16} /> Reintentar
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              <Home size={16} /> Ir al Inicio
            </button>
          </div>
        </div>
      )}

      {/* ====== INTRO / INICIO ====== */}
      {!started && !victory && !defeat && (
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
      )}

      {/* ====== IN-GAME ====== */}
      {started && !victory && !defeat && (
        <>
          <header className="coliseo-header" role="banner" aria-label="Encabezado del Coliseo">
            <button className="icon-btn exit-btn" onClick={() => navigate('/dashboard')} aria-label="Abandonar arena">
              <X size={18} aria-hidden="true" />
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

          <div className="coliseo-main">
            <div className="coliseo-arena">
              <Mascot type="dragon" mood={status==='incorrect'?'sad':status==='correct'?'happy':'normal'} size="lg" />
              <div className="coliseo-q-card">
                <h2>{currentQ.q}</h2>
                <div ref={optionsRef} className="quiz-options">
                  {currentQ.options.map((opt, i) => {
                    let btnClass = 'quiz-opt-btn card '
                    if (status !== 'idle') {
                      if (opt === currentQ.a) btnClass += 'correct '
                      else if (selected && opt === selected) btnClass += 'incorrect '
                      else btnClass += 'disabled '
                    }
                    return (
                      <button
                        key={i}
                        className={btnClass}
                        onClick={() => handleSelect(opt)}
                        disabled={status !== 'idle'}
                        aria-label={`Opción ${String.fromCharCode(65 + i)}: ${opt}`}
                      >
                        <span className="opt-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                        <span className="opt-text">{opt}</span>
                        {status !== 'idle' && opt === currentQ.a && <span className="opt-icon" aria-hidden="true">✓</span>}
                        {status !== 'idle' && selected && opt === selected && opt !== currentQ.a && <span className="opt-icon" aria-hidden="true">✗</span>}
                      </button>
                    )
                  })}
                </div>
                {status === 'incorrect' && errorHint && (
                  <div className="coliseo-error-hint">
                    <AlertCircle size={14} /> {errorHint}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FAB de respuesta por voz (estándar RF-25) */}
          <button
            className="fab-mic"
            aria-label="Responder por voz. Mantén presionado para dictar tu respuesta."
            title="Mantener para responder por voz"
          >
            <Mic size={24} aria-hidden="true" />
          </button>
        </>
      )}
    </PageWrapper>
  )
}
