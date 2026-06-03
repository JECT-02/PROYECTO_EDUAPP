import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Mic, Volume2, LoaderCircle } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { playCorrect, playIncorrect, playTimeout } from '../utils/sounds'
import { vibrateCorrect, vibrateIncorrect, vibrateTimeout } from '../utils/vibration'
import Mascot from '../components/Mascot'
import { analyzeError, generateQuiz } from '../lib/llm'
import { recordWeakness, isSupabaseConfigured, getCourseNodes } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import './Quiz.css'

export default function Quiz() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const { studentId } = useAuth()
  const [questions, setQuestions] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle')
  const [errorHint, setErrorHint] = useState('')
  const [loading, setLoading] = useState(true)
  const answersRef = useRef([])

  // Load questions from DB or generate via AI
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        if (!isSupabaseConfigured) return
        const { data: nodes } = await getCourseNodes(courseId)
        if (cancelled) return
        const found = (nodes || []).find(
          (n) => String(n.position) === String(nodeId) || String(n.id) === String(nodeId)
        )
        if (found?.content) {
          // content is JSON string like {"questions": [...]}
          try {
            const parsed = typeof found.content === 'string' ? JSON.parse(found.content) : found.content
            if (parsed?.questions?.length > 0) {
              setQuestions(parsed.questions)
              setLoading(false)
              return
            }
          } catch { /* not JSON, fall through */ }
        }
        // Generate quiz via AI
        const json = await generateQuiz({ courseId, nodeId, count: 4 })
        if (!cancelled && json?.questions?.length > 0) {
          setQuestions(json.questions)
        } else {
          console.warn('[quiz] generateQuiz devolvio preguntas vacias, usando fallback')
        }
      } catch (e) {
        console.warn('[quiz] error cargando preguntas:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, nodeId])

  const q = questions?.[qIndex]

  useEffect(() => {
    if (!q || status !== 'idle') return
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
  }, [qIndex, status, q])

  function recordAnswer(selectedIndex) {
    if (!q) return
    answersRef.current = [
      ...answersRef.current,
      {
        questionId: q.id,
        question: q.text,
        options: q.options,
        correct: q.correct,
        selected: selectedIndex,
        isCorrect: selectedIndex === q.correct,
        explanation: q.explanation || ''
      }
    ]
  }

  function handleTimeOut() {
    playTimeout()
    vibrateTimeout()
    recordAnswer(-1)
    setStatus('incorrect')
    triggerAnalysis(null).catch(() => {})
    setTimeout(nextQuestion, 2000)
  }

  async function triggerAnalysis(selectedIndex) {
    if (!q) return
    if (!isSupabaseConfigured) return
    try {
      const { explanation } = await analyzeError({
        question: q.text,
        userAnswer: selectedIndex == null ? 'Sin respuesta' : q.options[selectedIndex],
        correctAnswer: q.options[q.correct],
        courseId,
        concept: q.text.split(' ').slice(0, 3).join(' '),
      })
      if (explanation) setErrorHint(explanation)
      if (studentId) {
        await recordWeakness({
          studentId,
          courseId,
          concept: q.text.split(' ').slice(0, 3).join(' '),
          isError: true,
        })
      }
    } catch { /* silent */ }
  }

  function handleSelect(index) {
    if (!q || status !== 'idle') return
    setSelected(index)
    recordAnswer(index)
    if (index === q.correct) {
      playCorrect()
      vibrateCorrect()
      setStatus('correct')
    } else {
      playIncorrect()
      vibrateIncorrect()
      setStatus('incorrect')
      triggerAnalysis(index).catch(() => {})
    }
    setTimeout(nextQuestion, 1500)
  }

  function nextQuestion() {
    if (!questions || qIndex + 1 < questions.length) {
      setQIndex(prev => prev + 1)
      setTimeLeft(30)
      setSelected(null)
      setStatus('idle')
    } else {
      const finalScore = answersRef.current.filter(a => a.isCorrect).length
      navigate('/quiz/result', {
        state: {
          score: finalScore,
          total: questions?.length || 0,
          courseId,
          nodeId,
          answers: answersRef.current
        }
      })
    }
  }

  // Loading state
  if (loading) {
    return (
      <PageWrapper className="quiz-page">
        <header className="quiz-header">
          <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)}><X size={18}/></button>
        </header>
        <main className="quiz-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <LoaderCircle size={32} className="animate-spin" style={{ marginBottom: 12 }} />
            <p>Generando preguntas con IA...</p>
          </div>
        </main>
      </PageWrapper>
    )
  }

  if (!q) {
    return (
      <PageWrapper className="quiz-page">
        <header className="quiz-header">
          <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)}><X size={18}/></button>
        </header>
        <main className="quiz-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay preguntas disponibles para este nodo.</p>
        </main>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="quiz-page">
      <header className="quiz-header">
        <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)}><X size={18}/></button>
        <div className="quiz-progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${(qIndex / questions.length) * 100}%`}} />
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

      <button className="fab-mic" title="Mantener para responder por voz">
        <Mic size={24} />
      </button>

      {status === 'incorrect' && q && (
        <div className="quiz-feedback-toast error">
          <Mascot type="robot" size="sm" mood="sad" />
          <div className="toast-text">
            <strong>¡Cuidado!</strong> La respuesta correcta era la {String.fromCharCode(65 + q.correct)}.
            {errorHint ? ` ${errorHint}` : ' Vamos a revisarlo luego.'}
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
