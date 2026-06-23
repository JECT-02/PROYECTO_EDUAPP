import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Bot, X, Sparkles, LoaderCircle, RefreshCw } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { getCourseWithNodes, getCourseNodes, getCourseNodesAllStatus, getStudentEnrollments, markNodeProgress, isSupabaseConfigured } from '../lib/api'
import { sanitizeHtml } from '../lib/sanitize'
import { renderMarkdown } from '../lib/markdown'
import { getAccessToken } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Lesson.css'

export default function Lesson() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const { role, studentId } = useAuth()
  const isTeacher = role === 'teacher'
  const [dbNode, setDbNode] = useState(null)
  const [dbLoading, setDbLoading] = useState(true)
  const [allNodes, setAllNodes] = useState([])
  const [courseName, setCourseName] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setDbLoading(true)
      if (!isSupabaseConfigured) {
        setDbNode(null)
        setDbLoading(false)
        return
      }
      const nodesFn = isTeacher ? getCourseNodesAllStatus : getCourseNodes
      const { data: nodes } = await nodesFn(courseId)
      if (cancelled) return
      if (nodes) setAllNodes(nodes)
      const { data: courseData } = await getCourseWithNodes(courseId)
      if (!cancelled && courseData?.title) setCourseName(courseData.title)
      const found = (nodes || []).find((n) => String(n.position) === String(nodeId) || String(n.id) === String(nodeId))
      if (found?.content) {
        setDbNode(found)
        setDbLoading(false)
        return
      }
      try {
        const accessToken = await getAccessToken()
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ courseId, nodeId }),
        })
        if (!res.ok || !res.body) {
          console.warn('generate-lesson HTTP error:', res.status)
          throw new Error('generate-lesson failed')
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let fullContent = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split('\n\n')
          buffer = events.pop() || ''
          for (const evt of events) {
            const line = evt.split('\n').find((l) => l.startsWith('data:'))
            if (!line) continue
            const payload = line.replace(/^data:\s*/, '')
            if (payload === '[DONE]') continue
            try {
              const parsed = JSON.parse(payload)
              if (typeof parsed.text === 'string') {
                fullContent += parsed.text
              }
            } catch { /* skip malformed */ }
          }
        }
        if (!cancelled && fullContent.trim()) {
          setDbNode({
            ...(found || { title: 'Lección' }),
            content: fullContent,
            title: found?.title || 'Lección',
          })
        }
      } catch (e) {
        console.warn('generate-lesson fallback error:', e)
      } finally {
        if (!cancelled) setDbLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, nodeId])

  const lessonData = dbNode
    ? {
      title: dbNode.title || 'Lección',
      content: splitContent(dbNode.content),
    }
    : {
      title: 'Cargando lección...',
      content: ['<p>Espera un momento mientras se carga el contenido de la lección.</p>'],
    }

  const [content, setContent] = useState(lessonData.content)
  const [isAiEnhanced, setIsAiEnhanced] = useState(false)

  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: '¡Hola! Soy tu asistente de aprendizaje. ¿Hay algo de esta lección que te gustaría que te explique mejor?' }
  ])
  const [inputText, setInputText] = useState('')
  const [chatStreaming, setChatStreaming] = useState(false)
  const [courseSources, setCourseSources] = useState([])
  const courseTitle = lessonData?.title || 'Curso'
  const chatEndRef = useRef(null)
  const chatAbortRef = useRef(null)
  const lastAiResponseRef = useRef('')
  const blockRefs = useRef([])
  const chatInputRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const [activeBlock, setActiveBlock] = useState(0)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  useEffect(() => {
    setContent(lessonData.content)
    setIsAiEnhanced(false)
    setActiveBlock(0)
    setMessages([
      { role: 'ai', text: '¡Hola! Soy tu asistente de aprendizaje. ¿Hay algo de esta lección que te gustaría que te explique mejor?' }
    ])
  }, [courseId, nodeId, dbNode])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (showChat || isDesktop) {
      chatMessagesRef.current?.focus()
      if (courseSources.length === 0 && isSupabaseConfigured) {
        ; (async () => {
          try {
            const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'
            const token = await getAccessToken()
            const res = await fetch(`${AI_BACKEND_URL}/api/course-sources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ courseId }),
            })
            const data = await res.json()
            if (data?.files?.length > 0) {
              setCourseSources(data.files)
              console.log(`[chat] ${data.files.length} archivos cargados como contexto`)
            }
          } catch (e) {
            console.warn('[chat] no se pudieron cargar fuentes del curso:', e.message)
          }
        })()
      }
    }
  }, [showChat, isDesktop])

  function handleContentKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = activeBlock === content.length - 1 ? 0 : activeBlock + 1
      setActiveBlock(next)
      blockRefs.current[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = activeBlock === 0 ? content.length - 1 : activeBlock - 1
      setActiveBlock(prev)
      blockRefs.current[prev]?.focus()
    }
  }

  const abortChat = useCallback(() => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort()
      chatAbortRef.current = null
    }
    setChatStreaming(false)
  }, [])

  async function handleSendChat() {
    if (!inputText.trim() || chatStreaming) return
    const userMsg = inputText.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInputText('')

    if (userMsg.toLowerCase().includes('no entiendo') || userMsg.toLowerCase().includes('más fácil')) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Entiendo perfectamente. Voy a simplificar los conceptos para ti.' }])
      return
    }

    if (!isSupabaseConfigured) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Estoy procesando una explicación más detallada sobre ese punto...' }])
      return
    }

    const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'
    const accessToken = await getAccessToken()
    console.log('[chat] enviando mensaje:', userMsg.slice(0, 60))
    const controller = new AbortController()
    chatAbortRef.current = controller
    setChatStreaming(true)
    setMessages(prev => [...prev, { role: 'ai', text: '' }])

    const fileTexts = [
      ...(courseSources.length > 0 ? courseSources : []),
      ...(lessonData.content.length > 0
        ? [{ filename: 'Lección actual', text: lessonData.content.join('\n').slice(0, 5000) }]
        : []),
    ]

    try {
      const res = await fetch(`${AI_BACKEND_URL}/api/ask-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          question: userMsg,
          courseTitle: courseTitle,
          fileTexts,
          history: messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'student' : 'tutor', text: m.text })),
        }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        console.error('[chat] error HTTP:', res.status, errText)
        throw new Error(`Error ${res.status}: ${errText.slice(0, 200)}`)
      }
      console.log('[chat] conexion establecida, leyendo stream...')
      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let acc = ''
      let chunkCount = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const evt of events) {
          const line = evt.split('\n').find((l) => l.startsWith('data:'))
          if (!line) continue
          const payload = line.replace(/^data:\s*/, '')
          if (payload === '[DONE]') continue
          try {
            const parsed = JSON.parse(payload)
            if (parsed.done) break
            if (typeof parsed.text === 'string') {
              chunkCount++
              acc += parsed.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'ai', text: acc }
                return copy
              })
            } else if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch {
            acc += payload
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { role: 'ai', text: acc }
              return copy
            })
          }
        }
      }
      console.log(`[chat] stream completo: ${chunkCount} chunks, total ${acc.length} chars`)
      if (acc.trim().length > 20) {
        lastAiResponseRef.current = acc
        setContent(splitContent(acc))
        setIsAiEnhanced(true)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[chat] error:', err)
        const detail = err.message ? `. ${err.message.split('. ')[0]}` : ''
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'ai', text: `Lo siento, hubo un error al consultar al tutor${detail}. Intenta de nuevo.` }
          return copy
        })
      }
    } finally {
      setChatStreaming(false)
      chatAbortRef.current = null
    }
  }

  function findNextNode() {
    if (!allNodes || allNodes.length === 0) return null
    const sorted = [...allNodes].sort((a, b) => (a.position || 0) - (b.position || 0))
    const currentIdx = sorted.findIndex(n => String(n.position) === String(nodeId) || String(n.id) === String(nodeId))
    if (currentIdx === -1 || currentIdx >= sorted.length - 1) return null
    return sorted[currentIdx + 1]
  }

  async function handleFinishNode() {
    try {
      if (isSupabaseConfigured && dbNode?.id && !isTeacher && studentId) {
        const { data: enrollments } = await getStudentEnrollments(studentId)
        const enrollment = (enrollments || []).find(
          (e) => e.course_id === courseId || String(e.course_id) === String(courseId)
        )
        if (enrollment) {
          const { error } = await markNodeProgress({
            enrollmentId: enrollment.id,
            nodeId: dbNode.id,
            state: 'completed',
            score: 1,
            completed: true,
          })
          if (error) console.warn('[lesson] markNodeProgress error:', error.message)
        } else {
          console.warn('[lesson] no enrollment found for student', studentId, 'course', courseId)
        }
      }
    } catch (e) {
      console.warn('[lesson] handleFinishNode error:', e)
    }

    const nextNode = findNextNode()
    if (nextNode) {
      const path = nextNode.type === 'quiz' ? '/quiz' : nextNode.type === 'boss' ? '/coliseo' : '/lesson'
      navigate(`${path}/${courseId}/${nextNode.position || nextNode.id}`)
    } else {
      navigate(`/roadmap/${courseId}`)
    }
  }

  return (
    <PageWrapper className="lesson-page">
      <header className="lesson-header" role="banner" aria-label="Encabezado de lección">
        <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)} aria-label="Volver al mapa"><ArrowLeft size={18} aria-hidden="true" /></button>
        <div className="lesson-title-wrap" tabIndex={0} role="region" aria-label={`Curso ${courseName || courseId}, Lección: ${lessonData.title}`}>
          <span className="lesson-subtitle" aria-hidden="true">{courseName || 'Curso'} • Lección</span>
          <h1 className="lesson-title" aria-hidden="true">{lessonData.title}</h1>
        </div>
      </header>

      <div className="lesson-body">
        <div className="lesson-content">
          {dbLoading ? (
            <div className="lesson-loading" role="status" aria-label="Cargando lección">
              <LoaderCircle size={32} className="animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <div
              className="lesson-text-container"
              role="application"
              aria-label="Contenido de la lección"
              tabIndex={0}
              onKeyDown={handleContentKeyDown}
              onFocus={(e) => { if (e.target === e.currentTarget) { setActiveBlock(0); blockRefs.current[0]?.focus() } }}
            >
              {isAiEnhanced && (
                <div className="ai-feedback-badge animate-fadeInUp" style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8', padding: '8px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <span><Sparkles size={14} /> Contenido mejorado por el Tutor IA</span>
                  <button
                    className="icon-btn sm"
                    onClick={() => {
                      setIsAiEnhanced(false)
                      setContent(lessonData.content)
                    }}
                    title="Restaurar contenido original"
                    style={{ color: '#818CF8', background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                    aria-label="Restaurar contenido original"
                  >
                    <RefreshCw size={12} /> Original
                  </button>
                </div>
              )}
              {content.map((html, i) => (
                <div
                  key={i}
                  ref={el => blockRefs.current[i] = el}
                  tabIndex={-1}
                  className="lesson-block"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ))}
            </div>
          )}
        </div>

        {(isDesktop || showChat) && (
          <div className="ai-chat-window" role="dialog" aria-label="Chat con asistente">
            <div className="chat-header">
              <h3><Bot size={18} /> Tutor</h3>
              {!isDesktop && (
                <button className="icon-btn sm" onClick={() => setShowChat(false)} aria-label="Cerrar asistente"><X size={14} /></button>
              )}
            </div>
            <div ref={chatMessagesRef} className="chat-messages" tabIndex={0} aria-live="polite" aria-label="Mensajes del asistente">
              {messages.map((m, i) => (
                (m.role === 'user' || m.text) && (
                  <div
                    key={i}
                    className={`chat-msg ${m.role}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text || '') }}
                  />
                )
              ))}
              {chatStreaming && (
                <div className="chat-msg ai chat-typing">
                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Pensando
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-area">
              <input
                ref={chatInputRef}
                type="text"
                className="chat-input"
                placeholder="Pregunta algo..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !chatStreaming && handleSendChat()}
                disabled={chatStreaming}
                aria-label="Escribe tu pregunta al tutor"
              />
              <button
                className="chat-send"
                onClick={handleSendChat}
                disabled={chatStreaming}
                aria-label="Enviar mensaje"
              >
                {<Send size={16} />}
              </button>
              {chatStreaming && (
                <button
                  className="chat-cancel"
                  onClick={abortChat}
                  aria-label="Detener respuesta del tutor"
                  title="Detener"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="lesson-footer">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleFinishNode}
          aria-label="Terminar nodo y continuar al siguiente"
        >
          Terminar Nodo
        </button>
      </footer>

      {!isDesktop && !showChat && (
        <button className="ai-chat-trigger" onClick={() => setShowChat(true)} aria-label="Abrir asistente de IA">
          <Bot size={28} />
        </button>
      )}
    </PageWrapper>
  )
}

function splitContent(rawContent) {
  if (!rawContent) return []
  if (Array.isArray(rawContent)) return rawContent
  const html = String(rawContent)
  const containers = []
  const protectedHtml = html.replace(
    /<div\s+class="(?:example-box|key-concept)"[\s\S]*?<\/div>/gi,
    (match) => {
      containers.push(match)
      return `<!--CONTAINER_${containers.length - 1}-->`
    }
  )
  const blocks = protectedHtml
    .split(/(?=<(?:h[23]|p|div|pre|ul|ol|blockquote)\b)/i)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => b.replace(/<!--CONTAINER_(\d+)-->/g, (_, i) => containers[parseInt(i)]))
  return blocks.length > 0 ? blocks : [`<p>${html}</p>`]
}
