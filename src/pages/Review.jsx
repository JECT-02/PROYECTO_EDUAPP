import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, MessageSquare, ExternalLink, Play, CheckCircle2, XCircle, LoaderCircle, Send, Search } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { analyzeError, reinforceConcept, getStudentLevel } from '../lib/llm'
import { isSupabaseConfigured, getCourseNodes, getUnderstandingData } from '../lib/api'
import { useVoice } from '../context/VoiceContext'
import { useAuth } from '../context/AuthContext'
import './Review.css'

export default function Review() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const { state } = useLocation()
  const { setPageContext, registerHandler } = useVoice()
  const { studentId } = useAuth()
  const [studentLevel, setStudentLevel] = useState('intermediate')
  const [hubOpen, setHubOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [aiExplanations, setAiExplanations] = useState({})
  const [loadingExplanations, setLoadingExplanations] = useState(true)
  const [nextNodePath, setNextNodePath] = useState(null)
  const [userQuestion, setUserQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [loadingAiAnswer, setLoadingAiAnswer] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')

  useEffect(() => { setPageContext({ page: 'review' }) }, [setPageContext])
  useEffect(() => { return registerHandler('understood', () => handleEntendido()) }, [registerHandler])

  useEffect(() => {
    if (!isSupabaseConfigured || !studentId || !courseId) return
    getUnderstandingData(studentId, courseId).then(({ data }) => {
      if (data) setStudentLevel(getStudentLevel(
        data.avgScore != null ? data.avgScore : (data.completedNodes / Math.max(data.totalNodes, 1)) * 100
      ))
    }).catch(() => {})
  }, [courseId, studentId])

  const answers = state?.answers || []
  const incorrectAnswers = answers.filter(a => !a.isCorrect)

  useEffect(() => {
    let cancelled = false
    async function loadNext() {
      if (!courseId || !nodeId) return
      try {
        const { data: nodes } = await getCourseNodes(courseId)
        if (cancelled || !nodes) return
        const sorted = [...nodes].sort((a, b) => a.position - b.position)
        const cur = sorted.find(n => String(n.position) === String(nodeId) || String(n.id) === String(nodeId))
        const curPos = cur?.position || parseInt(nodeId) || 0
        const next = sorted.find(n => n.position === curPos + 1)
        if (next) {
          const type = next.type
          setNextNodePath((type === 'quiz' || type === 'boss') ? `/quiz/${courseId}/${next.position}` : `/lesson/${courseId}/${next.position}`)
        } else {
          setNextNodePath(`/roadmap/${courseId}`)
        }
      } catch { setNextNodePath(`/roadmap/${courseId}`) }
    }
    loadNext()
    return () => { cancelled = true }
  }, [courseId, nodeId])

  const goNext = useCallback(() => {
    if (nextNodePath) navigate(nextNodePath)
    else navigate(`/roadmap/${courseId}`)
  }, [nextNodePath, navigate, courseId])

  function promiseWithTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ])
  }

  useEffect(() => {
    if (incorrectAnswers.length === 0) {
      setLoadingExplanations(false)
      return
    }
    if (!isSupabaseConfigured) {
      setLoadingExplanations(false)
      return
    }

    let cancelled = false
    async function loadExplanations() {
      setLoadingExplanations(true)
      const explanations = {}

      for (let i = 0; i < incorrectAnswers.length; i++) {
        if (cancelled) break
        const answer = incorrectAnswers[i]
        try {
          const concept = answer.question?.split(' ').slice(0, 4).join(' ') || ''
          const result = await promiseWithTimeout(
            analyzeError({
              question: answer.question,
              userAnswer: answer.selected >= 0 ? answer.options[answer.selected] : 'No respondiste',
              correctAnswer: answer.options[answer.correct],
              courseId,
              concept,
            }),
            15000
          )
          const raw = result?.explanation || ''
          const clean = sanitizeExplanation(raw)
          explanations[i] = clean || 'La IA analizó tu error. Revisa el concepto nuevamente.'
        } catch (e) {
          console.warn('[review] analyzeError timeout/fail:', e.message)
          explanations[i] = answer.explanation || 'Revisa el material de clase para entender mejor este concepto.'
        }
        // Update progressively so user sees each analysis as it arrives
        if (!cancelled) setAiExplanations({ ...explanations })
      }

      if (!cancelled) setLoadingExplanations(false)
    }
    loadExplanations()
    return () => { cancelled = true }
  }, [incorrectAnswers, courseId])

  function sanitizeExplanation(text) {
    if (!text || text.length < 10) return ''
    const cleaned = text.replace(/["{}[\]\\]/g, '').replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]+/g, '').trim()
    if (cleaned.length < 10) return ''
    const repeated = /(\b\w+\b)(\s+\1){2,}/.test(cleaned)
    if (repeated) return ''
    const hasLetters = /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(cleaned)
    if (!hasLetters) return ''
    return cleaned.length > 300 ? cleaned.slice(0, 300) : cleaned
  }

  useEffect(() => {
    if (!hubOpen) {
      setAiAnswer('')
      setUserQuestion('')
      setVideoUrl('')
      return
    }
    const currentAnswer = incorrectAnswers[currentIndex]
    if (!currentAnswer) return
    const query = encodeURIComponent(
      (currentAnswer.question || '') + ' ' + (currentAnswer.options?.[currentAnswer.correct] || '')
    )
    setVideoUrl(`https://www.youtube.com/results?search_query=${query}`)
  }, [hubOpen, currentIndex, incorrectAnswers])

  async function handleAskAI(e) {
    e?.preventDefault()
    if (!userQuestion.trim() || loadingAiAnswer) return
    setLoadingAiAnswer(true)
    setAiAnswer('')
    try {
      const currentAnswer = incorrectAnswers[currentIndex]
      const result = await reinforceConcept({
        concept: currentAnswer?.question?.split(' ').slice(0, 4).join(' ') || 'este tema',
        question: userQuestion.trim(),
        courses: [courseId],
      studentAnswer: currentAnswer?.selected >= 0 ? currentAnswer.options[currentAnswer.selected] : '',
      correctAnswer: currentAnswer?.options[currentAnswer.correct] || '',
      studentLevel,
    })
      const raw = result?.explanation || result?.reinforcement || result?.text || ''
      const clean = sanitizeExplanation(raw)
      setAiAnswer(clean || 'No pude generar una respuesta. Intenta con otra pregunta.')
    } catch {
      setAiAnswer('Error al consultar. Intenta de nuevo.')
    } finally {
      setLoadingAiAnswer(false)
    }
  }

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
  const currentAiExplanation = aiExplanations[currentIndex] || currentAnswer?.explanation || ''

  function handleNext() {
    setHubOpen(false)
    if (currentIndex < totalIncorrect - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      goNext()
    }
  }

  function handleEntendido() {
    if (currentIndex < totalIncorrect - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      goNext()
    }
  }

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
            <button className="btn btn-primary btn-lg" onClick={goNext}>
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

          <div className="ai-analysis-card" tabIndex={0} role="region" aria-label={`Análisis: ${currentAiExplanation || 'Revisa el material de clase'}`}>
            <div aria-hidden="true">
              <div className="ai-header">
                <Mascot type="owl" size="sm" mood="normal" />
                <div>
                  <h3 className="ai-title">Análisis de tu error</h3>
                </div>
              </div>
              <div className="ai-body">
                {loadingExplanations ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                    <LoaderCircle size={16} className="animate-spin" /> Analizando tu respuesta...
                  </div>
                ) : (
                  <div>
                    {currentAiExplanation && (
                      <p style={{ marginBottom: 12 }}>{currentAiExplanation}</p>
                    )}
                    <div style={{
                      background: 'rgba(108,99,255,0.06)',
                      border: '1px solid rgba(108,99,255,0.12)',
                      borderRadius: 'var(--radius)',
                      padding: 12,
                      fontSize: '0.83rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                    }}>
                      <strong style={{ color: 'var(--success)' }}>Respuesta correcta:</strong>{' '}
                      {currentAnswer.options[currentAnswer.correct]}
                      <br />
                      <strong style={{ color: 'var(--error)' }}>Tu respuesta fue:</strong>{' '}
                      {currentAnswer.selected >= 0 ? currentAnswer.options[currentAnswer.selected] : 'Sin responder'}
                    </div>
                  </div>
                )}
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
            <div className="hub-card animate-fadeInUp">
              <h2 className="hub-title">Refuerzo</h2>

              <div className="hub-section">
                <h4 className="hub-sub"><MessageSquare size={16}/> 1. Pregunta a la IA</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 10 }}>
                  Escribe una pregunta sobre este tema y la IA te explicará.
                </p>
                <form onSubmit={handleAskAI} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    className="input-field"
                    placeholder={`Ej: ¿Por qué "${currentAnswer.options[currentAnswer.correct]}" es la respuesta correcta?`}
                    value={userQuestion}
                    onChange={e => setUserQuestion(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={loadingAiAnswer || !userQuestion.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {loadingAiAnswer ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
                {aiAnswer && (
                  <div className="analogy-box" aria-live="polite" aria-atomic="true">
                    {aiAnswer}
                  </div>
                )}
              </div>

              <div className="hub-section">
                <h4 className="hub-sub"><Play size={16}/> 2. Video Recomendado</h4>
                {videoUrl ? (
                  <div
                    className="video-card"
                    tabIndex={0}
                    role="link"
                    aria-label="Buscar video relacionado en YouTube"
                    onClick={() => window.open(videoUrl, '_blank')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(videoUrl, '_blank') } }}
                  >
                    <div className="video-thumb"><Search size={20} /></div>
                    <div className="video-info">
                      <div className="v-title">Buscar video sobre este tema</div>
                      <div className="v-time">Abre YouTube con resultados relacionados</div>
                    </div>
                    <ExternalLink size={16} color="var(--text-muted)"/>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.83rem' }}>
                    <LoaderCircle size={14} className="animate-spin" /> Buscando video...
                  </div>
                )}
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
