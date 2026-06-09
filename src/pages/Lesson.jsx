import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Volume2, FastForward, Check, Send, Bot, X, Sparkles, LoaderCircle, RefreshCw } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { getCourseNodes, getCourseNodesAllStatus, markNodeProgress, isSupabaseConfigured } from '../lib/api'
import { sanitizeHtml } from '../lib/sanitize'
import { getAccessToken } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Lesson.css'

export default function Lesson() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const { role } = useAuth()
  const isTeacher = role === 'teacher'
  const [dbNode, setDbNode] = useState(null)
  const [dbLoading, setDbLoading] = useState(true)
  const [allNodes, setAllNodes] = useState([])

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
          return
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
          const paragraphs = fullContent.split('\n').filter(p => p.trim()).map(p => p.trim())
          setDbNode({
            ...(found || { title: 'Lección' }),
            content: paragraphs.length > 1 ? paragraphs : [fullContent],
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
        simplified: ['Contenido simplificado no disponible.'],
      }
    : {
        title: 'Cargando lección...',
        content: ['Espera un momento mientras se carga el contenido de la lección.'],
        simplified: ['Cargando...'],
      }

  const [content, setContent] = useState(lessonData.content)
  const [displayedText, setDisplayedText] = useState(content.map(() => ''))
  const [readIndex, setReadIndex] = useState(0)
  const [skip, setSkip] = useState(false)
  const [progress, setProgress] = useState(0)
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
  const paragraphRefs = useRef([])
  const chatInputRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const [activeParagraph, setActiveParagraph] = useState(0)

  useEffect(() => {
    setContent(lessonData.content)
    setDisplayedText(lessonData.content.map(() => ''))
    setReadIndex(0)
    setProgress(0)
    setSkip(false)
    setIsAiEnhanced(false)
    setActiveParagraph(0)
    setMessages([
      { role: 'ai', text: '¡Hola! Soy tu asistente de aprendizaje. ¿Hay algo de esta lección que te gustaría que te explique mejor?' }
    ])
  }, [courseId, nodeId, dbNode])

  useEffect(() => {
    if (skip) {
      setDisplayedText(content.map(t => formatParagraph(t)))
      setProgress(100)
      return
    }

    if (readIndex < content.length) {
      const fullText = content[readIndex]
      let currentLength = 0

      const interval = setInterval(() => {
        currentLength += 2
        let textToShow = fullText.slice(0, currentLength)
        textToShow = formatParagraph(textToShow)

        setDisplayedText(prev => {
          const next = [...prev]
          next[readIndex] = textToShow
          return next
        })

        if (currentLength >= fullText.length) {
          clearInterval(interval)
          setTimeout(() => {
            setReadIndex(r => r + 1)
            setProgress(((readIndex + 1) / content.length) * 100)
          }, 800)
        }
      }, 20)
      return () => clearInterval(interval)
    }
  }, [readIndex, skip, content])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (showChat) {
      chatMessagesRef.current?.focus()
      if (courseSources.length === 0 && isSupabaseConfigured) {
        ;(async () => {
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
  }, [showChat])

  function handleContentKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = activeParagraph === displayedText.length - 1 ? 0 : activeParagraph + 1
      setActiveParagraph(next)
      paragraphRefs.current[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = activeParagraph === 0 ? displayedText.length - 1 : activeParagraph - 1
      setActiveParagraph(prev)
      paragraphRefs.current[prev]?.focus()
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
      setTimeout(() => {
        setContent(lessonData.simplified)
        setDisplayedText(lessonData.simplified.map(() => ''))
        setReadIndex(0)
        setSkip(false)
        setProgress(0)
      }, 1000)
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
        const paragraphs = acc.split('\n').filter(p => p.trim()).map(p => p.trim())
        setContent(paragraphs.length > 1 ? paragraphs : [acc])
        setReadIndex(0)
        setDisplayedText(paragraphs.length > 1 ? paragraphs.map(() => '') : [''])
        setSkip(false)
        setProgress(0)
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

  /**
   * Find the next node and navigate to it.
   * Logic: after finishing a node, go to the next node in the roadmap.
   * If it's the last node, go back to roadmap.
   */
  function findNextNode() {
    if (!allNodes || allNodes.length === 0) return null
    // Sort by position
    const sorted = [...allNodes].sort((a, b) => (a.position || 0) - (b.position || 0))
    const currentIdx = sorted.findIndex(n => String(n.position) === String(nodeId) || String(n.id) === String(nodeId))
    if (currentIdx === -1 || currentIdx >= sorted.length - 1) return null
    return sorted[currentIdx + 1]
  }

  async function handleFinishNode() {
    try {
      if (isSupabaseConfigured && dbNode?.id) {
        await markNodeProgress({
          enrollmentId: null,
          nodeId: dbNode.id,
          state: 'completed',
          score: 1,
          completed: true,
        }).catch(() => { /* sin enrollment es ok */ })
      }
    } catch { /* no-op */ }

    // Navigate to the next node
    const nextNode = findNextNode()
    if (nextNode) {
      const path = nextNode.type === 'quiz' ? '/quiz' : nextNode.type === 'boss' ? '/coliseo' : '/lesson'
      navigate(`${path}/${courseId}/${nextNode.position || nextNode.id}`)
    } else {
      // No more nodes, go back to roadmap
      navigate(`/roadmap/${courseId}`)
    }
  }

  return (
    <PageWrapper className="lesson-page">
      <header className="lesson-header" role="banner" aria-label="Encabezado de lección">
        <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)} aria-label="Volver al mapa"><ArrowLeft size={18} aria-hidden="true"/></button>
        <div className="lesson-title-wrap" tabIndex={0} role="region" aria-label={`Curso ${courseId}, Lección: ${lessonData.title}`}>
          <span className="lesson-subtitle" aria-hidden="true">Curso {courseId} • Lección</span>
          <h1 className="lesson-title" aria-hidden="true">{lessonData.title}</h1>
        </div>
      </header>

      <div className="lesson-content">
        <div
          className="lesson-text-container"
          role="application"
          aria-label="Contenido de la lección"
          tabIndex={0}
          onKeyDown={handleContentKeyDown}
          onFocus={(e) => { if (e.target === e.currentTarget) { setActiveParagraph(0); paragraphRefs.current[0]?.focus() } }}
        >
          {isAiEnhanced && content !== lessonData.simplified && (
            <div className="ai-feedback-badge animate-fadeInUp" style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8', padding: '8px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
              <span><Sparkles size={14}/> Contenido mejorado por el Tutor IA</span>
              <button
                className="icon-btn sm"
                onClick={() => {
                  setIsAiEnhanced(false)
                  setContent(lessonData.content)
                  setDisplayedText(lessonData.content.map(() => ''))
                  setReadIndex(0)
                  setSkip(false)
                  setProgress(0)
                }}
                title="Restaurar contenido original"
                style={{ color: '#818CF8', background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                aria-label="Restaurar contenido original"
              >
                <RefreshCw size={12}/> Original
              </button>
            </div>
          )}
          {displayedText.map((html, i) => (
            <p
              key={i}
              ref={el => paragraphRefs.current[i] = el}
              tabIndex={-1}
              className="lesson-paragraph"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ))}
        </div>
      </div>

      <footer className="lesson-footer">
        <div className="lesson-progress-row">
          <div className="progress-bar" style={{flex:1}}>
            <div className="progress-fill" style={{width:`${progress}%`}}/>
          </div>
          <span className="progress-lbl" aria-live="polite">{Math.round(progress)}% completado</span>
        </div>
        <div className="lesson-footer-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setSkip(true)}
            disabled={skip || progress >= 100}
            aria-label="Saltar animación de escritura y mostrar todo el contenido"
          >
            <FastForward size={16}/> Saltar
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleFinishNode}
            disabled={progress < 75}
            aria-label="Terminar nodo y continuar al siguiente"
          >
            Terminar Nodo
          </button>
        </div>
      </footer>

      {showChat && (
        <div className="ai-chat-window" role="dialog" aria-label="Chat con asistente">
          <div className="chat-header">
            <h3><Bot size={18}/> Tutor IA</h3>
            <button className="icon-btn sm" onClick={() => setShowChat(false)} aria-label="Cerrar asistente"><X size={14}/></button>
          </div>
          <div ref={chatMessagesRef} className="chat-messages" tabIndex={0} aria-live="polite" aria-label="Mensajes del asistente">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-msg ${m.role}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text || '').replace(/\n/g, '<br/>') }}
              />
            ))}
            {chatStreaming && (
              <div className="chat-msg ai chat-typing">
                <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> pensando...
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
              aria-label="Escribe tu pregunta al tutor IA"
            />
            <button
              className="chat-send"
              onClick={handleSendChat}
              disabled={chatStreaming}
              aria-label="Enviar mensaje"
            >
              {chatStreaming ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16}/>}
            </button>
            {chatStreaming && (
              <button
                className="chat-cancel"
                onClick={abortChat}
                aria-label="Detener respuesta del tutor"
                title="Detener"
              >
                <X size={14}/>
              </button>
            )}
          </div>
        </div>
      )}
      {!showChat && (
        <button className="ai-chat-trigger" onClick={() => setShowChat(true)} aria-label="Abrir asistente de IA">
          <Bot size={28} />
        </button>
      )}
    </PageWrapper>
  )
}

function formatParagraph(text) {
  return text
    .replace(/<key>/g, '<span class="interactive-word">')
    .replace(/<\/key>/g, '</span>')
}

function splitContent(rawContent) {
  if (!rawContent) return []
  if (Array.isArray(rawContent)) return rawContent
  const stripped = String(rawContent)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
  return stripped
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
