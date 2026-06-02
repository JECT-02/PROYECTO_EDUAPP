import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Mic, Volume2 } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { playCorrect, playIncorrect, playTimeout } from '../utils/sounds'
import Mascot from '../components/Mascot'
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

  // Track all answers for the result page
  const answersRef = useRef([])
  const q = QUESTIONS[qIndex]

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
    recordAnswer(-1) // no seleccionó nada
    setStatus('incorrect')
    setTimeout(nextQuestion, 2000)
  }

  function handleSelect(index) {
    if (status !== 'idle') return
    setSelected(index)
    recordAnswer(index)
    if (index === q.correct) {
      playCorrect()
      setStatus('correct')
    } else {
      playIncorrect()
      setStatus('incorrect')
    }
    setTimeout(nextQuestion, 1500)
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
      <header className="quiz-header">
        <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)}><X size={18}/></button>
        <div className="quiz-progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${((qIndex)/QUESTIONS.length)*100}%`}} />
          </div>
        </div>
        <div className="quiz-timer" style={{ color: timeLeft < 10 ? 'var(--error)' : 'var(--text)' }}>
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </header>

      <main className="quiz-main">
        <div className="quiz-content">
          <button className="icon-btn tts-btn"><Volume2 size={16}/></button>
          <h2 className="quiz-question">{q.text}</h2>

          <div className={`quiz-options ${q.options.length === 2 ? 'grid-2' : ''}`}>
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
                >
                  <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text">{opt}</span>
                  {status !== 'idle' && i === q.correct && <span className="opt-icon">✓</span>}
                  {status !== 'idle' && i === selected && i !== q.correct && <span className="opt-icon">✗</span>}
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {/* Voice Control FAB */}
      <button className="fab-mic" title="Mantener para responder por voz">
        <Mic size={24} />
      </button>

      {status === 'incorrect' && (
        <div className="quiz-feedback-toast error">
          <Mascot type="robot" size="sm" mood="sad" />
          <div className="toast-text">
            <strong>¡Cuidado!</strong> La respuesta correcta era la {String.fromCharCode(65 + q.correct)}.
            Vamos a revisarlo luego.
          </div>
        </div>
      )}
      {status === 'correct' && (
        <div className="quiz-feedback-toast success">
          <Mascot type="robot" size="sm" mood="happy" />
          <div className="toast-text">
            <strong>¡Excelente!</strong> Muy bien hecho.
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
