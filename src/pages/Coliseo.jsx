import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Swords, X, Trophy, ArrowRight, Clock, RotateCcw, Home, Mic, LoaderCircle } from 'lucide-react'
import Mascot from '../components/Mascot'
import { playCorrect, playIncorrect, playVictory } from '../utils/sounds'
import { vibrateCorrect, vibrateIncorrect, vibrateVictory } from '../utils/vibration'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { useVoice } from '../context/VoiceContext'
import { isSupabaseConfigured, getStudentEnrollments, getCourseNodes, updateProfileXP } from '../lib/api'
import { checkAchievements } from '../lib/achievements'
import { generateQuiz } from '../lib/llm'
import './Coliseo.css'

export default function Coliseo() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { studentId, user } = useAuth()
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
  const [errorHint, setErrorHint] = useState('')
  const timerRef = useRef(null)
  const [quizAnnouncement, setQuizAnnouncement] = useState('')
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState('')
  const [timeAnnouncement, setTimeAnnouncement] = useState('')

  // Load questions from course or generate
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingQuestions(true)
      try {
        // Try to load from course nodes (boss content)
        if (courseId && isSupabaseConfigured && studentId) {
          const { data: nodes } = await getCourseNodes(courseId)
          if (!cancelled && nodes?.length) {
            const bossNode = nodes.find(n => n.type === 'boss' && n.content)
            if (bossNode) {
              try {
                const parsed = typeof bossNode.content === 'string' ? JSON.parse(bossNode.content) : bossNode.content
                if (parsed?.questions?.length > 0) {
                  const mapped = parsed.questions.map(q => ({
                    q: q.text,
                    a: q.options[q.correct] || q.options[0],
                    options: q.options.slice(0, 4).filter(Boolean),
                  }))
                  if (!cancelled) setQuestions(mapped)
                  setCourseTitle(nodes[0]?.title || 'Curso')
                  setLoadingQuestions(false)
                  return
                }
              } catch {}
            }
            // Fallback: pick quiz questions from nodes
            const quizNodes = nodes.filter(n => n.type === 'quiz' && n.content)
            const allQs = []
            for (const qn of quizNodes) {
              try {
                const p = typeof qn.content === 'string' ? JSON.parse(qn.content) : qn.content
                if (p?.questions) {
                  p.questions.forEach(q => allQs.push({
                    q: q.text,
                    a: q.options[q.correct] || q.options[0],
                    options: q.options.slice(0, 4).filter(Boolean),
                  }))
                }
              } catch {}
            }
            if (allQs.length >= 3) {
              const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, 10)
              if (!cancelled) setQuestions(shuffled)
              setCourseTitle(nodes[0]?.title || 'Curso')
              setLoadingQuestions(false)
              return
            }
          }
        }
        // Ultimate fallback: hardcoded generic questions
        if (!cancelled) setQuestions(GENERIC_QUESTIONS)
      } catch { if (!cancelled) setQuestions(GENERIC_QUESTIONS) }
      if (!cancelled) setLoadingQuestions(false)
    }
    load()
    return () => { cancelled = true }
  }, [courseId, studentId])

  const currentQ = questions[qIndex]

  // Voice: register option selector + enter arena
  useEffect(() => {
    setPageContext({ page: 'coliseo', options: currentQ?.options || [] })
    const unreg = registerHandler('selectOption', ({ index }) => {
      if (currentQ?.options?.[index]) handleSelect(currentQ.options[index])
    })
    return unreg
  }, [currentQ, registerHandler, setPageContext])
  useEffect(() => {
    const unreg = registerHandler('enterArena', () => { if (!started && !victory && !defeat) setStarted(true) })
    return unreg
  }, [started, victory, defeat, registerHandler])

  // Timer
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
    if (!started || victory || defeat) return
    const mins = Math.floor(timeLeft / 60)
    setQuizAnnouncement(`${mins >= 1 ? mins + ' minutos' : timeLeft + ' segundos'}. ${lives} vidas. ${currentQ?.q || ''}`)
  }, [qIndex, started, victory, defeat, currentQ, lives, timeLeft])

  function handleSelect(option) {
    if (status !== 'idle') return
    setSelected(option)
    if (option === currentQ.a) {
      playCorrect(); vibrateCorrect()
      setStatus('correct')
      setScore(s => s + 1)
      setTimeout(() => {
        if (qIndex + 1 < questions.length) {
          setQIndex(qIndex + 1); setSelected(null); setStatus('idle'); setErrorHint('')
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
        else { setQIndex(qIndex + 1); setSelected(null); setStatus('idle'); setErrorHint('') }
      }, 800)
    }
  }

  async function handleVictory() {
    playVictory(); vibrateVictory()
    const xpBonus = 150 + score * 30
    setXpEarned(xpBonus)
    setVictory(true)
    // Award XP
    if (studentId && isSupabaseConfigured) {
      try {
        const currentXp = user?.fullProfile?.pet_xp || 0
        await updateProfileXP(studentId, currentXp + xpBonus)
      } catch {}
      // Check achievements
      const perfect = lives === 3 && score === questions.length
      checkAchievements(studentId, {
        coliseo_won: true,
        coliseo_perfect: perfect,
      }).then(unlocked => {
        if (unlocked.length) console.log('[achievements] coliseo:', unlocked.map(a => a.name).join(', '))
      }).catch(() => {})
    }
  }

  if (loadingQuestions) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <LoaderCircle size={32} className="animate-spin" style={{ marginBottom: 12 }} />
          <p>Preparando retos...</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className={`coliseo-page${started && !victory && !defeat ? ' in-game' : ' center-all'}`}>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">{quizAnnouncement}</div>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">{feedbackAnnouncement}</div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{timeAnnouncement}</div>

      {victory && (
        <div className="coliseo-intro animate-scaleIn">
          <Trophy size={80} color="#FACC15" style={{ margin: '0 auto 24px', display: 'block' }} />
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', textAlign: 'center' }}>¡MAESTRÍA LOGRADA!</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: 8, textAlign: 'center' }}>
            Has superado el Coliseo de Retos
            {courseTitle ? ` de ${courseTitle}` : ''} con éxito.
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
          <span style={{ fontSize: '4rem', display: 'block', textAlign: 'center', marginBottom: 16 }}>💔</span>
          <h1 style={{ textAlign: 'center', marginBottom: 12 }}>Derrota</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 24 }}>
            Has perdido todas tus vidas. {score}/{questions.length} correctas.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-accent btn-lg" onClick={() => { setDefeat(false); setStarted(false); setLives(3); setQIndex(0); setScore(0); setTimeLeft(1800) }}>
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
          <Swords size={56} color="#FACC15" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h1 className="gradient-text" style={{ textAlign: 'center', marginBottom: 12 }}>Coliseo de Retos</h1>
          {courseTitle && <p style={{ textAlign: 'center', color: 'var(--primary-light)', fontWeight: 700, marginBottom: 8 }}>{courseTitle}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            <span>⚔️ {questions.length} preguntas</span>
            <span>⏱️ 30 minutos</span>
            <span>❤️ 3 vidas</span>
            <span>⭐ XP x3 por victoria</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color={timeLeft < 60 ? 'var(--error)' : timeLeft < 300 ? '#F59E0B' : 'var(--text-dim)'} />
              <span style={{ color: timeLeft < 60 ? 'var(--error)' : timeLeft < 300 ? '#F59E0B' : 'var(--text-dim)', fontWeight: 700 }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3].map(i => (
                <Heart key={i} size={18} fill={i <= lives ? 'var(--error)' : 'none'} color={i <= lives ? 'var(--error)' : 'var(--text-dim)'} />
              ))}
            </div>
            <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Salir del coliseo"><X size={18} /></button>
          </header>
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Mascot type="dragon" size="lg" mood={status === 'correct' ? 'happy' : status === 'incorrect' ? 'sad' : 'normal'} />
            <div className="coliseo-q-card" style={{ width: '100%', maxWidth: 500, marginTop: 16 }}>
              <h2 style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: 20 }}>{currentQ.q}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentQ.options.map((opt, i) => {
                  let cls = 'quiz-opt-btn card '
                  if (status !== 'idle') {
                    if (opt === currentQ.a) cls += 'correct '
                    else if (opt === selected) cls += 'incorrect '
                    else cls += 'disabled '
                  }
                  return (
                    <button key={i} className={cls} onClick={() => handleSelect(opt)} disabled={status !== 'idle'}>
                      <span className="opt-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                      <span className="opt-text">{opt}</span>
                      {status !== 'idle' && opt === currentQ.a && <span className="opt-icon">✓</span>}
                      {status !== 'idle' && opt === selected && opt !== currentQ.a && <span className="opt-icon">✗</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            {errorHint && status === 'incorrect' && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', maxWidth: 500, width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {errorHint}
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
