import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Bot, X, Sparkles, LoaderCircle, RefreshCw, ChevronDown } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { getCourseWithNodes, getCourseNodes, getCourseNodesAllStatus, getStudentEnrollments, markNodeProgress, isSupabaseConfigured, updateProfileXP } from '../lib/api'
import { sanitizeHtml } from '../lib/sanitize'
import { renderMarkdown, renderLessonContent } from '../lib/markdown'
import { getAccessToken } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useVoice } from '../context/VoiceContext'
import { notifyNodeCompleted } from '../lib/notifications'
import { checkAchievements } from '../lib/achievements'
import { getUnderstandingData } from '../lib/api'
import { getStudentLevel } from '../lib/llm'
import './Lesson.css'

export default function Lesson() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const { role, studentId, user, refreshProfile } = useAuth()
  const { registerHandler, setPageContext } = useVoice()
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

  useEffect(() => {
    if (!isSupabaseConfigured || !studentId || !courseId) return
    getUnderstandingData(studentId, courseId).then(({ data }) => {
      if (data) setStudentLevel(getStudentLevel(
        data.avgScore != null ? data.avgScore : (data.completedNodes / Math.max(data.totalNodes, 1)) * 100
      ))
    }).catch(() => {})
  }, [courseId, studentId])

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
  const [generatedVersions, setGeneratedVersions] = useState([])
  const [activeVersion, setActiveVersion] = useState(null)
  const [showVersionMenu, setShowVersionMenu] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const versionTriggerRef = useRef(null)

  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: '¡Hola! Soy tu asistente de aprendizaje. ¿Hay algo de esta lección que te gustaría que te explique mejor?' }
  ])
  const [inputText, setInputText] = useState('')
  const [chatStreaming, setChatStreaming] = useState(false)
  const [studentLevel, setStudentLevel] = useState('intermediate')
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

  // Lock body/html scroll — only lesson-content and chat scroll
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    setContent(lessonData.content)
    setIsAiEnhanced(false)
    setGeneratedVersions([])
    setActiveVersion(null)
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
    if (!showVersionMenu) return
    const handler = (e) => {
      if (!e.target.closest('.ai-feedback-badge-dropdown') && !e.target.closest('.ai-feedback-dropdown-menu')) setShowVersionMenu(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showVersionMenu])

  useEffect(() => {
    if (showChat || isDesktop) {
      chatMessagesRef.current?.focus()
      // Course sources now loaded client-side via Supabase when available
      // The chat uses current lesson content as fallback context
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

  // Voice: register lesson action handlers
  useEffect(() => {
    setPageContext({ page: 'lesson', courseTitle, nodeTitle: dbNode?.title || '', nodePosition: dbNode?.position, totalNodes: allNodes?.length })
  }, [courseTitle, dbNode, setPageContext])
  useEffect(() => { return registerHandler('finishNode', () => { if (dbNode) handleFinishNode() }) }, [dbNode, registerHandler])
  useEffect(() => { return registerHandler('openChat', () => { setIsDesktop(true); setShowChat(true) }) }, [registerHandler])
  useEffect(() => { return registerHandler('closeChat', () => { setShowChat(false) }) }, [registerHandler])

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

    const contentUpdateKeywords = ['mejora', 'regenera', 'genera', 'nueva versión', 'explica de otra forma', 'explícame de otra manera', 'simplifica', 'no entiendo', 'más fácil']
    const requestContentUpdate = contentUpdateKeywords.some(kw => userMsg.toLowerCase().includes(kw))

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

    if (!requestContentUpdate) {
      setMessages(prev => [...prev, { role: 'ai', text: '' }])
    }

    const fileTexts = [
      ...(courseSources.length > 0 ? courseSources : []),
      ...(lessonData.content.length > 0
        ? [{ filename: 'Lección actual', text: lessonData.content.join('\n').slice(0, 5000) }]
        : []),
    ]

    try {
      const historyPayload = messages.filter(m => m.text && m.text.trim()).slice(-6).map(m => ({ role: m.role === 'user' ? 'student' : 'tutor', text: m.text }))

      if (requestContentUpdate) {
        const contentRes = await fetch(`${AI_BACKEND_URL}/api/ask-stream`, {
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
            history: historyPayload,
            contentMode: true,
            studentLevel,
          }),
          signal: controller.signal,
        })
        if (!contentRes.ok || !contentRes.body) {
          const errText = await contentRes.text().catch(() => '')
          throw new Error(`Error ${contentRes.status}: ${errText.slice(0, 200)}`)
        }
        const reader = contentRes.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buf = ''
        let acc = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const evts = buf.split('\n\n')
          buf = evts.pop() || ''
          for (const evt of evts) {
            const line = evt.split('\n').find(l => l.startsWith('data:'))
            if (!line) continue
            const payload = line.replace(/^data:\s*/, '')
            if (payload === '[DONE]') continue
            try {
              const parsed = JSON.parse(payload)
              if (typeof parsed.text === 'string') acc += parsed.text
            } catch { acc += payload }
          }
        }
        if (acc.trim().length > 20) {
          const versionId = Date.now()
          const versionContent = splitContent(renderLessonContent(acc))
          setGeneratedVersions(prev => [...prev, { id: versionId, content: versionContent }])
          setContent(versionContent)
          setActiveVersion(versionId)
          setIsAiEnhanced(true)
          setMessages(prev => [...prev, {
            role: 'ai',
            text: `📄 <a href="#" class="version-link" data-version-id="${versionId}">Ver contenido generado (v${generatedVersions.length + 1})</a>\n\nAquí tienes una nueva versión del contenido. Puedes volver al original con el botón arriba.`
          }])
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: 'No pude generar una versión alternativa. Intenta de nuevo.' }])
        }
      } else {
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
            history: historyPayload,
            studentLevel,
          }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => '')
          throw new Error(`Error ${res.status}: ${errText.slice(0, 200)}`)
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let acc = ''
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
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[chat] error:', err)
        const isNvidiaError = err.message?.includes('NVIDIA') || err.message?.includes('500')
        const detail = isNvidiaError ? '' : err.message ? `. ${err.message.split('. ')[0]}` : ''
        const errorMsg = isNvidiaError
          ? 'El servicio de IA no está disponible temporalmente. Intenta de nuevo en unos momentos.'
          : `Lo siento, hubo un error al consultar al tutor${detail}. Intenta de nuevo.`
        if (requestContentUpdate) {
          setMessages(prev => [...prev, { role: 'ai', text: errorMsg }])
        } else {
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { role: 'ai', text: errorMsg }
            return copy
          })
        }
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
          else {
            notifyNodeCompleted(studentId, dbNode.title || 'Lección', courseName || 'tu curso').catch(() => {})
            const xpBonus = 20
            const currentXp = user?.fullProfile?.pet_xp || 0
            updateProfileXP(studentId, currentXp + xpBonus).catch(() => {})
            refreshProfile().catch(() => {})

            const { data: progress } = await getProgressForEnrollment(enrollment.id)
            const theoryCompleted = (progress || []).filter(p => p.state === 'completed').length
            const { data: nodes } = await getCourseNodesAllStatus(courseId)
            const allCompleted = nodes && theoryCompleted >= nodes.length
            checkAchievements(studentId, {
              theory_completed: theoryCompleted,
              course_completed: allCompleted ? 1 : 0,
            }).catch(() => {})
          }
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
    <PageWrapper className="lesson-page" style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
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
                <div className="ai-feedback-badge animate-fadeInUp">
                  <span className="ai-feedback-badge-label"><Sparkles size={14} /> Contenido mejorado por el Tutor IA</span>
                  <div className="ai-feedback-badge-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button
                      ref={versionTriggerRef}
                      className="ai-feedback-dropdown-trigger"
                      onClick={() => {
                        if (!showVersionMenu) {
                          const rect = versionTriggerRef.current?.getBoundingClientRect()
                          if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.left })
                        }
                        setShowVersionMenu(prev => !prev)
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={showVersionMenu}
                    >
                      {activeVersion !== null ? `Versión ${generatedVersions.findIndex(v => v.id === activeVersion) + 1}` : 'Original'}
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              )}
              {showVersionMenu && menuPos && createPortal(
                <div className="ai-feedback-dropdown-menu" role="listbox" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}>
                  <button
                    className={`ai-feedback-dropdown-item ${activeVersion === null ? 'active' : ''}`}
                    role="option"
                    aria-selected={activeVersion === null}
                    onClick={() => {
                      setActiveVersion(null)
                      setContent(lessonData.content)
                      setShowVersionMenu(false)
                    }}
                  >
                    <RefreshCw size={12} /> Original
                  </button>
                  {generatedVersions.map((v, i) => (
                    <button
                      key={v.id}
                      className={`ai-feedback-dropdown-item ${activeVersion === v.id ? 'active' : ''}`}
                      role="option"
                      aria-selected={activeVersion === v.id}
                      onClick={() => {
                        setActiveVersion(v.id)
                        setContent(v.content)
                        setShowVersionMenu(false)
                      }}
                    >
                      Versión {i + 1}
                    </button>
                  ))}
                </div>,
                document.body
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
            <div
              ref={chatMessagesRef}
              className="chat-messages"
              tabIndex={0}
              aria-live="polite"
              aria-label="Mensajes del asistente"
              onClick={(e) => {
                const link = e.target.closest('.version-link')
                if (link) {
                  e.preventDefault()
                  const versionId = Number(link.dataset.versionId)
                  const version = generatedVersions.find(v => v.id === versionId)
                  if (version) {
                    setActiveVersion(versionId)
                    setContent(version.content)
                  }
                }
              }}
            >
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

function isMarkdown(text) {
  if (!text) return false
  const t = String(text)
  if (/<(?:h[1-6]|p|div|ul|ol|table|pre|blockquote)\b/i.test(t)) return false
  if (/^#{1,3}\s+/m.test(t)) return true
  if (/\*\*[^*]+\*\*/.test(t)) return true
  if (/`[^`]+`/.test(t)) return true
  if (/^- \w/m.test(t)) return true
  if (/^\d+\.\s\w/m.test(t)) return true
  return false
}

function splitContent(rawContent) {
  if (!rawContent) return []
  if (Array.isArray(rawContent)) return rawContent
  const source = isMarkdown(rawContent) ? renderLessonContent(String(rawContent)) : String(rawContent)
  const containers = []
  const protectedHtml = source.replace(
    /<div\s+class="(?:example-box|key-concept)"[\s\S]*?<\/div>/gi,
    (match) => {
      containers.push(match)
      return `<!--CONTAINER_${containers.length - 1}-->`
    }
  )
  const blocks = protectedHtml
    .split(/(?=<(?:h[1-6]|p|div|pre|ul|ol|table|blockquote)\b)/i)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => b.replace(/<!--CONTAINER_(\d+)-->/g, (_, i) => containers[parseInt(i)]))
  return blocks.length > 0 ? blocks : [`<p>${source}</p>`]
}
