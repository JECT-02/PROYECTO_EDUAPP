import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Swords, X, Trophy, ArrowRight, Clock, RotateCcw, Home, LoaderCircle } from 'lucide-react'
import Mascot from '../components/Mascot'
import { playCorrect, playIncorrect, playVictory } from '../utils/sounds'
import { vibrateCorrect, vibrateIncorrect, vibrateVictory } from '../utils/vibration'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { useVoice } from '../context/VoiceContext'
import { isSupabaseConfigured, getStudentEnrollments, getCourseNodes, getProgressForEnrollment, updateProfileXP } from '../lib/api'
import { checkAchievements } from '../lib/achievements'
import { notifyColiseoResult } from '../lib/notifications'
import { generateColiseo } from '../lib/llm'
import './Coliseo.css'

export default function Coliseo() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { studentId, user, refreshProfile } = useAuth()
  const { registerHandler, setPageContext } = useVoice()
  const [questions, setQuestions] = useState([])
  const [courseTitle, setCourseTitle] = useState('')
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [started, setStarted] = useState(false)
  const [lives, setLives] = useState(3)
  const [qIndex, setQIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [selected, setSelected] = useState(null)
  const [victory, setVictory] = useState(false)
  const [defeat, setDefeat] = useState(false)
  const [timeLeft, setTimeLeft] = useState(1800)
  const [xpEarned, setXpEarned] = useState(0)
  const [score, setScore] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const timerRef = useRef(null)
  const [quizAnnouncement, setQuizAnnouncement] = useState('')
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState('')
  const [timeAnnouncement, setTimeAnnouncement] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingQuestions(true)
      try {
        if (!courseId || !isSupabaseConfigured || !studentId) {
          if (!cancelled) setQuestions(GENERIC_QUESTIONS)
          if (!cancelled) setLoadingQuestions(false)
          return
        }

        const { data: nodes } = await getCourseNodes(courseId)
        if (cancelled) return

        const enrollmentData = await getStudentEnrollments(studentId)
        const enrollment = (enrollmentData?.data || [])
          .find(e => e.course_id === courseId || String(e.course_id) === String(courseId))
        const progressData = enrollment
          ? (await getProgressForEnrollment(enrollment.id)).data || []
          : []
        const completedNodeIds = new Set(
          progressData.filter(p => p.state === 'completed').map(p => p.node_id)
        )

        const sortedNodes = (nodes || []).sort((a, b) => (a.position || 0) - (b.position || 0))
        const lastCompletedIdx = sortedNodes.reduce(
          (max, n, i) => completedNodeIds.has(n.id) ? i : max, 0
        )
        const relevantNodes = sortedNodes.slice(0, lastCompletedIdx + 1)

        const courseTitleFromNodes = sortedNodes[0]?.title || sortedNodes[0]?.courses?.title || ''
        if (!cancelled) setCourseTitle(courseTitleFromNodes || 'Curso')

        let generatedQuestions = null

        // 1) Try AI generation via generate-coliseo Edge Function (Kimi LLM)
        if (courseId && isSupabaseConfigured) {
          try {
            const completedTitles = relevantNodes.map(n => n.title || n.description || '').filter(Boolean)
            const result = await generateColiseo({
              courseId,
              count: 10,
              completedNodes: completedTitles,
            })
            if (!cancelled && result?.questions?.length > 0) {
              generatedQuestions = result.questions.map(q => ({
                q: q.text || q.question || '',
                a: q.options?.[q.correct ?? 0] || q.correct_answer || q.options?.[0] || '',
                options: (q.options || []).slice(0, 4).filter(Boolean),
              }))
            }
          } catch (e) {
            console.warn('[coliseo] IA generation failed, falling back to node questions:', e.message)
          }
        }

        if (cancelled) return

        if (generatedQuestions && generatedQuestions.length >= 3) {
          setQuestions(generatedQuestions)
        } else {
          // 2) Fallback: collect questions from completed nodes
          const collectedQuestions = []
          for (const node of relevantNodes) {
            if (node.content) {
              try {
                const parsed = typeof node.content === 'string' ? JSON.parse(node.content) : node.content
                if (parsed?.questions) {
                  for (const q of parsed.questions) {
                    collectedQuestions.push({
                      q: q.text,
                      a: q.options?.[q.correct] || q.options?.[0] || '',
                      options: (q.options || []).slice(0, 4).filter(Boolean),
                    })
                  }
                }
              } catch {}
            }
          }
          if (collectedQuestions.length >= 5) {
            setQuestions(collectedQuestions.sort(() => Math.random() - 0.5).slice(0, 10))
          } else if (collectedQuestions.length > 0) {
            setQuestions(collectedQuestions.sort(() => Math.random() - 0.5))
          } else {
            setQuestions(GENERIC_QUESTIONS)
          }
        }
      } catch {
        if (!cancelled) setQuestions(GENERIC_QUESTIONS)
      }
      if (!cancelled) setLoadingQuestions(false)
    }
    load()
    return () => { cancelled = true }
  }, [courseId, studentId, refreshKey])

  const currentQ = questions[qIndex]

  useEffect(() => {
    setPageContext({ page: 'coliseo', options: currentQ?.options || [] })
    const unreg = registerHandler('selectOption', ({ index }) => {
      if (currentQ?.options?.[index]) handleSelect(index)
    })
    return unreg
  }, [currentQ, registerHandler, setPageContext])


  useEffect(() => {
    if (started && currentQ) {
      setQuizAnnouncement(`Pregunta ${qIndex + 1} de ${questions.length}`)
      document.querySelector('.quiz-opt-btn:not(:disabled)')?.focus()
    }
  }, [started, currentQ, qIndex, questions.length])
  useEffect(() => {
    const unreg = registerHandler('enterArena', () => { if (!started && !victory && !defeat) setStarted(true) })
    return unreg
  }, [started, victory, defeat, registerHandler])

  useEffect(() => {
    if (!started || victory || defeat) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setDefeat(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [started, victory, defeat])



  useEffect(() => { if (started) setTimeLeft(1800) }, [started])

  useEffect(() => {
    if (victory) {
      document.querySelector('.coliseo-intro .btn')?.focus()
    }
  }, [victory])

  useEffect(() => {
    if (defeat) {
      document.querySelector('.coliseo-intro .btn')?.focus()
    }
  }, [defeat])

  function handleSelect(index) {
    if (status !== 'idle' || !currentQ) return
    setSelected(index)
    const isCorrect = currentQ.options[index] === currentQ.a
    if (isCorrect) {
      playCorrect(); vibrateCorrect()
      setStatus('correct')
      setScore(s => s + 1)
      setTimeout(() => {
        if (qIndex + 1 < questions.length) {
          setQIndex(qIndex + 1); setSelected(null); setStatus('idle')
        } else {
          handleVictory()
        }
      }, 800)
    } else {
      playIncorrect(); vibrateIncorrect()
      setStatus('incorrect')
      const newLives = lives - 1
      setLives(newLives)
      setTimeout(() => {
        if (newLives <= 0) { setDefeat(true) }
        else if (qIndex + 1 >= questions.length) handleVictory()
        else { setQIndex(qIndex + 1); setSelected(null); setStatus('idle') }
      }, 800)
    }
  }

  async function handleVictory() {
    playVictory(); vibrateVictory()
    const xpBonus = 150 + score * 30
    setXpEarned(xpBonus)
    setVictory(true)

    if (studentId && isSupabaseConfigured) {
      try {
        const currentXp = user?.fullProfile?.pet_xp || 0
        await updateProfileXP(studentId, currentXp + xpBonus)
        await refreshProfile()
      } catch {}

      const perfect = lives === 3 && score === questions.length
      const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

      notifyColiseoResult(studentId, pct >= 70, pct, courseTitle || 'Curso').catch(() => {})

      checkAchievements(studentId, {
        coliseo_won: true,
        coliseo_perfect: perfect,
      }).catch(() => {})
    }
  }

  if (loadingQuestions) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }} role="status" aria-live="polite">
          <LoaderCircle size={32} className="animate-spin" style={{ marginBottom: 12 }} aria-hidden="true" />
          <p>Generando desafío con IA...</p>
        </div>
      </PageWrapper>
    )
  }

  const timeColor = timeLeft < 60 ? 'var(--error)' : timeLeft < 300 ? '#F59E0B' : 'var(--text-dim)'

  return (
    <PageWrapper className={`coliseo-page${started && !victory && !defeat ? ' in-game' : ' center-all'}`}>
      <div className="visually-hidden">{quizAnnouncement}</div>
      <div className="visually-hidden">{feedbackAnnouncement}</div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{timeAnnouncement}</div>

      {victory && (
        <div className="coliseo-intro animate-scaleIn">
          <Trophy size={80} color="#FACC15" style={{ margin: '0 auto 24px', display: 'block' }} aria-hidden="true" />
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', textAlign: 'center' }}>¡MAESTRÍA LOGRADA!</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: 8, textAlign: 'center' }}>
            Has superado el Coliseo de Retos
            {courseTitle ? ` de ${courseTitle}` : ''}.
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FACC15', textAlign: 'center', marginBottom: 4 }}>
            ⭐ +{xpEarned} XP
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
            {score}/{questions.length} respuestas correctas, {lives} {lives === 1 ? 'vida' : 'vidas'} restantes
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-accent btn-lg" onClick={() => navigate('/dashboard')}>
              <Home size={18} /> Dashboard
            </button>
            {courseId && <button className="btn btn-primary btn-lg" onClick={() => navigate(`/roadmap/${courseId}`)}>
              <ArrowRight size={18} /> Ver Roadmap
            </button>}
          </div>
        </div>
      )}

      {defeat && (
        <div className="coliseo-intro animate-scaleIn">
          <span style={{ fontSize: '4rem', display: 'block', textAlign: 'center', marginBottom: 16 }} aria-hidden="true">💔</span>
          <h1 style={{ textAlign: 'center', marginBottom: 12 }} aria-label="Derrota en el coliseo">Derrota</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 24 }}>
            Has perdido todas tus vidas. {score}/{questions.length} correctas.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-accent btn-lg" onClick={() => { setDefeat(false); setVictory(false); setStarted(false); setLives(3); setQIndex(0); setScore(0); setTimeLeft(1800); setStatus('idle'); setSelected(null); setXpEarned(0); setRefreshKey(k => k + 1) }}>
              <RotateCcw size={18} /> Reintentar
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate('/dashboard')}>
              <Home size={18} /> Salir
            </button>
          </div>
        </div>
      )}

      {!started && !victory && !defeat && (
        <div className="coliseo-intro animate-fadeInUp">
          <Swords size={56} color="#FACC15" style={{ margin: '0 auto 16px', display: 'block' }} aria-hidden="true" />
          <h1 className="gradient-text" style={{ textAlign: 'center', marginBottom: 12 }}>Coliseo de Retos</h1>
          {courseTitle && <p style={{ textAlign: 'center', color: 'var(--primary-light)', fontWeight: 700, marginBottom: 8 }}>{courseTitle}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }} role="list" aria-label="Reglas del coliseo">
            <span role="listitem">⚔️ {questions.length} preguntas generadas por IA</span>
            <span role="listitem">⏱️ 30 minutos</span>
            <span role="listitem">❤️ 3 vidas</span>
            <span role="listitem">⭐ XP por victoria</span>
          </div>
          <button className="btn btn-primary btn-lg full-w" onClick={() => setStarted(true)}>
            ¡Entrar a la Arena!
          </button>
        </div>
      )}

      {started && !victory && !defeat && currentQ && (
        <>
          <header className="coliseo-q-header">
            <span style={{ fontWeight: 700 }}>Ronda {qIndex + 1}/{questions.length}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} role="timer" aria-label={`${Math.floor(timeLeft / 60)} minutos y ${timeLeft % 60} segundos`}>
              <Clock size={14} color={timeColor} aria-hidden="true" />
              <span style={{ color: timeColor, fontWeight: 700 }} aria-hidden="true">
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 2 }} role="img" aria-label={`Vidas restantes: ${lives} de 3`}>
              {[1, 2, 3].map(i => (
                <Heart key={i} size={18} fill={i <= lives ? 'var(--error)' : 'none'} color={i <= lives ? 'var(--error)' : 'var(--text-dim)'} aria-hidden="true" />
              ))}
            </div>
            <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Salir del coliseo"><X size={18} /></button>
          </header>
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Mascot type="dragon" size="lg" mood={status === 'correct' ? 'happy' : status === 'incorrect' ? 'sad' : 'normal'} />
            <div className="coliseo-q-card" style={{ width: '100%', maxWidth: 500, marginTop: 16 }}>
              <h2 style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: 20 }} id="coliseo-question-heading" tabIndex={-1}>
                <span className="visually-hidden">Pregunta {qIndex + 1} de {questions.length}:</span> {currentQ.q}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentQ.options.map((opt, i) => {
                  let cls = 'quiz-opt-btn card '
                  if (status !== 'idle') {
                    if (opt === currentQ.a) cls += 'correct '
                    else if (i === selected) cls += 'incorrect '
                    else cls += 'disabled '
                  }
                  return (
                    <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={status !== 'idle'} aria-label={`opción ${String.fromCharCode(65 + i)} ${opt}`}>
                      <span className="opt-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                      <span className="opt-text" aria-hidden="true">{opt}</span>
                      {status !== 'idle' && opt === currentQ.a && <span className="opt-icon" aria-hidden="true">✓</span>}
                      {status !== 'idle' && i === selected && opt !== currentQ.a && <span className="opt-icon" aria-hidden="true">✗</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            {status === 'incorrect' && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', maxWidth: 500, width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                La respuesta correcta era: <strong style={{ color: 'var(--success)' }}>{currentQ.a}</strong>
              </div>
            )}
          </main>
        </>
      )}
    </PageWrapper>
  )
}

const GENERIC_QUESTIONS = [
  { q: "¿Qué es lo más importante al empezar un nuevo tema de estudio?", a: "Entender los conceptos fundamentales", options: ["Memorizar todo de inmediato", "Entender los conceptos fundamentales", "Saltar a los ejercicios avanzados", "Leer solo el resumen"] },
  { q: "¿Cuál es la mejor estrategia para retener información?", a: "Practicar con ejercicios y repasar", options: ["Leer una sola vez", "Practicar con ejercicios y repasar", "Estudiar solo antes del examen", "Copiar todo el material"] },
  { q: "¿Qué debes hacer si no entiendes un concepto?", a: "Buscar ejemplos y preguntar al tutor", options: ["Ignorarlo y seguir", "Memorizarlo sin entender", "Buscar ejemplos y preguntar al tutor", "Cambiar de tema"] },
  { q: "¿Por qué es importante hacer pausas al estudiar?", a: "Para consolidar el aprendizaje y evitar fatiga", options: ["Para perder el tiempo", "Para consolidar el aprendizaje y evitar fatiga", "Para olvidar lo estudiado", "Para distraerse"] },
  { q: "¿Qué papel juega la práctica en el aprendizaje?", a: "Refuerza las conexiones neuronales", options: ["Ninguno, solo teoría importa", "Refuerza las conexiones neuronales", "Solo sirve para perder tiempo", "Es opcional"] },
]
