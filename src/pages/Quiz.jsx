import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, LoaderCircle } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { playCorrect, playIncorrect, playTimeout } from '../utils/sounds'
import { vibrateCorrect, vibrateIncorrect, vibrateTimeout } from '../utils/vibration'
import Mascot from '../components/Mascot'
import { generateQuiz, getStudentLevel } from '../lib/llm'
import { isSupabaseConfigured, getCourseNodes, getUnderstandingData } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useVoice } from '../context/VoiceContext'
import './Quiz.css'

export default function Quiz() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const { studentId } = useAuth()
  const { registerHandler, setPageContext } = useVoice()
  const [questions, setQuestions] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle')
  const [loading, setLoading] = useState(true)
  const [quizAnnouncement, setQuizAnnouncement] = useState('')
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState('')
  const [timeAnnouncement, setTimeAnnouncement] = useState('')
  const [congratulations, setCongratulations] = useState('')
  const [studentLevel, setStudentLevel] = useState('intermediate')
  const answersRef = useRef([])
  const optionsRef = useRef(null)

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
          try {
            const parsed = typeof found.content === 'string' ? JSON.parse(found.content) : found.content
            if (parsed?.questions?.length > 0) {
              setQuestions(parsed.questions)
              if (parsed.congratulations) setCongratulations(parsed.congratulations)
              setLoading(false)
              return
            }
          } catch { /* not JSON, fall through */ }
        }
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

  useEffect(() => {
    if (!isSupabaseConfigured || !studentId || !courseId) return
    getUnderstandingData(studentId, courseId).then(({ data }) => {
      if (data) setStudentLevel(getStudentLevel(
        data.avgScore != null ? data.avgScore : (data.completedNodes / Math.max(data.totalNodes, 1)) * 100
      ))
    }).catch(() => {})
  }, [courseId, studentId])

  const q = questions?.[qIndex]

  // Voice: register option selector + page context
  useEffect(() => {
    setPageContext({ page: 'quiz', options: q?.options || [], nodeTitle: q?.text?.slice(0, 50) || 'Quiz', totalNodes: questions?.length })
    const unreg = registerHandler('selectOption', ({ index }) => { handleSelect(index) })
    return unreg
  }, [q, registerHandler, setPageContext])

  useEffect(() => {
    if (!q) return
    setQuizAnnouncement(`Pregunta ${qIndex + 1}`)
    setFeedbackAnnouncement('')
    setTimeAnnouncement('')
    requestAnimationFrame(() => {
      const heading = document.getElementById('quiz-question-heading')
      heading?.focus()
    })
  }, [qIndex, q])



  useEffect(() => {
    if (status !== 'idle') return
    if (timeLeft === 15) setTimeAnnouncement('15 segundos')
    else if (timeLeft === 10) setTimeAnnouncement('10 segundos')
    else if (timeLeft === 5) setTimeAnnouncement('5 segundos')
  }, [timeLeft, status])

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
        explanation: q.explanation || '',
      }
    ]
  }

  function handleTimeOut() {
    playTimeout()
    vibrateTimeout()
    recordAnswer(-1)
    setStatus('incorrect')
    if (q) {
      const msg = `Tiempo. ${String.fromCharCode(65 + q.correct)} - es la opción correcta`
      setFeedbackAnnouncement(msg)
    }
    setTimeout(nextQuestion, 3000)
  }

  function handleSelect(index) {
    if (!q || status !== 'idle') return
    setSelected(index)
    recordAnswer(index)
    if (index === q.correct) {
      playCorrect()
      vibrateCorrect()
      setFeedbackAnnouncement('Correcto')
      setStatus('correct')
      setTimeout(nextQuestion, 1500)
    } else {
      playIncorrect()
      vibrateIncorrect()
      const msg = `Incorrecta. ${String.fromCharCode(65 + q.correct)} - es la opción correcta`
      setFeedbackAnnouncement(msg)
      setStatus('incorrect')
      setTimeout(nextQuestion, 3000)
    }
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
          answers: answersRef.current,
          congratulations: congratulations || ''
        }
      })
    }
  }

  if (loading) {
    return (
      <PageWrapper className="quiz-page">
        <header className="quiz-header">
          <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)} aria-label="Cerrar cuestionario"><X size={18} aria-hidden="true"/></button>
        </header>
        <main className="quiz-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }} role="status" aria-live="polite">
            <LoaderCircle size={32} className="animate-spin" style={{ marginBottom: 12 }} aria-hidden="true" />
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
          <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)} aria-label="Cerrar cuestionario"><X size={18} aria-hidden="true"/></button>
        </header>
        <main className="quiz-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <p style={{ color: 'var(--text-muted)' }} role="status">No hay preguntas disponibles para este nodo.</p>
        </main>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="quiz-page">
      <header className="quiz-header" role="banner" aria-label="Encabezado del cuestionario">
        <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)} aria-label="Cerrar cuestionario"><X size={18} aria-hidden="true"/></button>
        <div className="quiz-progress-wrap">
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={qIndex}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-label={`Pregunta ${qIndex + 1} de ${questions.length}`}
          >
            <div className="progress-fill" style={{width: `${(qIndex / questions.length) * 100}%`}} />
          </div>
        </div>
        <div className="quiz-timer" style={{ color: timeLeft < 10 ? 'var(--error)' : 'var(--text)' }} aria-label={`${timeLeft} segundos`}>
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </header>

      <div className="quiz-main">
        <div className="quiz-content">
          <h2 className="quiz-question" id="quiz-question-heading" tabIndex={-1}>
            <span className="visually-hidden">Pregunta {qIndex + 1} de {questions.length}:</span> {q.text}
          </h2>

          <div ref={optionsRef} className={`quiz-options ${q.options.length === 2 ? 'grid-2' : ''}`}>
            {q.options.map((opt, i) => {
              const cleanOpt = typeof opt === 'string' ? opt.replace(/^[A-Da-d][).\]]\s*/, '') : opt
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
                  aria-label={`opción ${String.fromCharCode(65 + i)} ${cleanOpt}`}
                >
                  <span className="opt-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text" aria-hidden="true">{cleanOpt}</span>
                  {status !== 'idle' && i === q.correct && <span className="opt-icon" aria-hidden="true">✓</span>}
                  {status !== 'idle' && i === selected && i !== q.correct && <span className="opt-icon" aria-hidden="true">✗</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Screen reader announcements */}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{quizAnnouncement}</div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{feedbackAnnouncement}</div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{timeAnnouncement}</div>

      {status === 'incorrect' && q && (
        <div className="quiz-feedback-toast error" role="alert" aria-hidden="true">
          <Mascot type="robot" size="sm" mood="sad" />
          <div className="toast-text">
            <strong>¡Cuidado!</strong> La respuesta correcta era la {String.fromCharCode(65 + q.correct)}.
            <span style={{ display: 'block', marginTop: 4, opacity: 0.7, fontSize: '0.82rem' }}>Revisaremos esto al final del quiz.</span>
          </div>
        </div>
      )}
      {status === 'correct' && (
        <div className="quiz-feedback-toast success" role="status" aria-hidden="true">
          <Mascot type="robot" size="sm" mood="happy" />
          <div className="toast-text">
            <strong>¡Excelente!</strong> Muy bien hecho.
          </div>
        </div>
      )}

    </PageWrapper>
  )
}
