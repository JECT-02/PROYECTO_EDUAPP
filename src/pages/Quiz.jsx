import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Mic } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { playCorrect, playIncorrect, playTimeout } from '../utils/sounds'
import { vibrateCorrect, vibrateIncorrect, vibrateTimeout } from '../utils/vibration'
import './Quiz.css'

const QUESTIONS = [
  {
    id: 1,
    text: "¿Cuál es el orgánulo responsable de la generación de energía en la célula eucariota?",
    options: ["Núcleo", "Mitocondria", "Ribosoma", "Aparato de Golgi"],
    correct: 1,
    explanation: "La mitocondria es conocida como la 'central energética' de la célula porque produce ATP mediante la respiración celular."
  },
  {
    id: 2,
    text: "Las células procariotas tienen un núcleo definido rodeado por una membrana.",
    options: ["Verdadero", "Falso"],
    correct: 1,
    explanation: "Las células procariotas (como las bacterias) NO tienen núcleo definido. Su material genético está disperso en el citoplasma. La afirmación describe a las células eucariotas."
  }
]

export default function Quiz() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const [qIndex, setQIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle') // idle, correct, incorrect
  const [quizAnnouncement, setQuizAnnouncement] = useState('')
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState('')
  const [timeAnnouncement, setTimeAnnouncement] = useState('')

  // Track all answers for the result page
  const answersRef = useRef([])
  const optionsRef = useRef(null)
  const q = QUESTIONS[qIndex]

  // Announce question when a new question loads (options are on the buttons)
  useEffect(() => {
    setQuizAnnouncement(`Pregunta ${qIndex + 1}. 30s. ${q.text}`)
    setFeedbackAnnouncement('')
    setTimeAnnouncement('')

    // Focus first option immediately
    requestAnimationFrame(() => {
      const firstBtn = optionsRef.current?.querySelector('.quiz-opt-btn')
      firstBtn?.focus()
    })
  }, [qIndex])

  // Announce result (correct/incorrect) immediately
  useEffect(() => {
    if (status === 'correct') {
      setFeedbackAnnouncement('¡Correcto!')
    } else if (status === 'incorrect') {
      setFeedbackAnnouncement(`Incorrecto. La respuesta correcta era ${String.fromCharCode(65 + q.correct)}.`)
    }
  }, [status])

  // Announce time warnings at key thresholds
  useEffect(() => {
    if (timeLeft === 15) setTimeAnnouncement('Quedan 15 segundos')
    else if (timeLeft === 10) setTimeAnnouncement('Quedan 10 segundos')
    else if (timeLeft === 5) setTimeAnnouncement('Quedan 5 segundos')
    else if (timeLeft <= 3 && timeLeft > 0) setTimeAnnouncement(`${timeLeft} segundos`)
  }, [timeLeft])

  useEffect(() => {
    if (status !== 'idle') return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleTimeOut()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [qIndex, status])

  function recordAnswer(selectedIndex) {
    answersRef.current = [
      ...answersRef.current,
      {
        questionId: q.id,
        question: q.text,
        options: q.options,
        correct: q.correct,
        selected: selectedIndex,
        isCorrect: selectedIndex === q.correct,
        explanation: q.explanation
      }
    ]
  }

  function handleTimeOut() {
    playTimeout()
    vibrateTimeout()
    recordAnswer(-1) // no seleccionó nada
    setStatus('incorrect')
    setTimeout(nextQuestion, 3500)
  }

  function handleSelect(index) {
    if (status !== 'idle') return
    setSelected(index)
    recordAnswer(index)
    if (index === q.correct) {
      playCorrect()
      vibrateCorrect()
      setStatus('correct')
    } else {
      playIncorrect()
      vibrateIncorrect()
      setStatus('incorrect')      }
    setTimeout(nextQuestion, 3500)
  }

  function nextQuestion() {
    if (qIndex + 1 < QUESTIONS.length) {
      setQIndex(qIndex + 1)
      setTimeLeft(30)
      setSelected(null)
      setStatus('idle')
    } else {
      const finalScore = answersRef.current.filter(a => a.isCorrect).length
      navigate('/quiz/result', {
        state: {
          score: finalScore,
          total: QUESTIONS.length,
          courseId,
          nodeId,
          answers: answersRef.current
        }
      })
    }
  }

  return (
    <PageWrapper className="quiz-page">
      <header className="quiz-header" role="banner" aria-label="Encabezado del cuestionario">
        <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)} aria-label="Cerrar cuestionario"><X size={18} aria-hidden="true"/></button>
        <div className="quiz-progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${((qIndex)/QUESTIONS.length)*100}%`}} />
          </div>
        </div>
        <div className="quiz-timer" style={{ color: timeLeft < 10 ? 'var(--error)' : 'var(--text)' }}>
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </header>

      <div className="quiz-main">
        <div className="quiz-content">
          <h2 className="quiz-question">{q.text}</h2>

          <div ref={optionsRef} className={`quiz-options ${q.options.length === 2 ? 'grid-2' : ''}`}>
            {q.options.map((opt, i) => {
              let btnClass = 'quiz-opt-btn card '
              if (status !== 'idle') {
                if (i === q.correct) btnClass += 'correct '
                else if (i === selected) btnClass += 'incorrect '
                else btnClass += 'disabled '
              } else if (i === selected) {
                btnClass += 'selected '
              }

              return (
                <button
                  key={i}
                  className={btnClass}
                  onClick={() => handleSelect(i)}
                  disabled={status !== 'idle'}
                  aria-label={`Opción ${String.fromCharCode(65 + i)}: ${opt}`}
                >
                  <span className="opt-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text">{opt}</span>
                  {status !== 'idle' && i === q.correct && <span className="opt-icon" aria-hidden="true">✓</span>}
                  {status !== 'idle' && i === selected && i !== q.correct && <span className="opt-icon" aria-hidden="true">✗</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Screen reader announcements */}
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">{quizAnnouncement}</div>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">{feedbackAnnouncement}</div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{timeAnnouncement}</div>

      {/* FAB de respuesta por voz (estándar RF-25) */}
      <button
        className="fab-mic"
        aria-label="Responder por voz. Mantén presionado para dictar tu respuesta."
        title="Mantener para responder por voz"
      >
        <Mic size={24} aria-hidden="true" />
      </button>


    </PageWrapper>
  )
}
