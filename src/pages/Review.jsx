import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, MessageSquare, ExternalLink, Play, CheckCircle2, XCircle, LoaderCircle, Send, Search } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { getStudentLevel } from '../lib/llm'
import { isSupabaseConfigured, getCourseNodes, getUnderstandingData } from '../lib/api'
import { getAccessToken } from '../lib/supabase'
import { renderMarkdown } from '../lib/markdown'
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
      const concept = currentAnswer?.question?.split(' ').slice(0, 4).join(' ') || 'este tema'
      const studentAns = currentAnswer?.selected >= 0 ? currentAnswer.options[currentAnswer.selected] : 'No respondiste'
      const correctAns = currentAnswer?.options[currentAnswer.correct] || ''

      const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'
      const accessToken = await getAccessToken()
      const res = await fetch(`${AI_BACKEND_URL}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          question: `Concepto: ${concept}\nRespuesta correcta: ${correctAns}\nRespuesta del estudiante: ${studentAns}\n\nPregunta del estudiante: ${userQuestion.trim()}`,
          context: `El estudiante se equivocó en una pregunta sobre "${concept}". La respuesta correcta era: ${correctAns}.`,
        }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const raw = data?.answer || ''
      const clean = raw.length > 300 ? raw.slice(0, 300) : raw
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
  const currentExplanation = currentAnswer?.explanation || 'Revisa el material de clase para entender mejor este concepto.'

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

          <div className="ai-analysis-card" tabIndex={0} role="region" aria-label={`Análisis: ${currentExplanation}`}>
            <div aria-hidden="true">
              <div className="ai-header">
                <Mascot type="owl" size="sm" mood="normal" />
                <div>
                  <h3 className="ai-title">Análisis de tu error</h3>
                </div>
              </div>
              <div className="ai-body">
                {currentExplanation && (
                  <p>{currentExplanation}</p>
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
                  <div className="analogy-box" aria-live="polite" aria-atomic="true" dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAnswer) }} />
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
