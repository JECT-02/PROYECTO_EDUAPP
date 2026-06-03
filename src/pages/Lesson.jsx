import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Volume2, FastForward, Check, Send, Bot, X, Sparkles, LoaderCircle, RefreshCw } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { getCourseNodes, getCourseNodesAllStatus, markNodeProgress, isSupabaseConfigured } from '../lib/api'
import { sanitizeHtml } from '../lib/sanitize'
import { getAccessToken } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Lesson.css'

const COURSE_CONTENT = {
  '1': {
    title: 'La Membrana Plasmática',
    content: [
      "La <key>membrana plasmática</key> es una estructura vital que delimita la célula, separando su medio interno del entorno externo.",
      "Está compuesta principalmente por una <key>bicapa lipídica</key> de fosfolípidos, donde se insertan proteínas que actúan como canales.",
      "Su función principal es el <key>transporte selectivo</key>: permite el paso de nutrientes y la expulsión de desechos.",
      "Además, juega un papel crucial en la <key>comunicación celular</key>, detectando señales químicas del exterior."
    ],
    simplified: [
      "Imagina que la célula es como una pequeña ciudad y la <key>membrana</key> es su muralla protectora.",
      "Esta muralla tiene <key>puertas inteligentes</key> que solo dejan pasar comida y energía.",
      "Está hecha de una capa doble de grasitas especiales que permiten que todo se mueva con suavidad.",
      "También tiene 'antenas' para recibir mensajes de otras células vecinas."
    ]
  },
  '2': {
    title: 'Límites y Continuidad',
    content: [
      "Un <key>límite</key> describe el comportamiento de una función cuando se acerca a un valor específico de x.",
      "Decimos que una función es <key>continua</key> si no presenta saltos, huecos o asíntotas en su dominio.",
      "El concepto de límite es la base fundamental sobre la cual se construye todo el <key>cálculo diferencial</key> e integral.",
      "Para que un límite exista, los límites laterales (por izquierda y derecha) deben ser exactamente <key>iguales</key>."
    ],
    simplified: [
      "Un <key>límite</key> es como ver a qué lugar intenta llegar una hormiguita en un dibujo.",
      "Una línea es <key>continua</key> si puedes dibujarla sin levantar el lápiz del papel.",
      "Es el primer paso para entender cómo cambian las cosas rápidamente en matemáticas.",
      "Si por ambos lados llegas al mismo punto, entonces el camino está bien definido."
    ]
  },
  '3': {
    title: 'La Revolución Industrial',
    content: [
      "La <key>Revolución Industrial</key> fue un proceso de transformación económica, social y tecnológica que comenzó en la segunda mitad del siglo XVIII.",
      "Se originó en el Reino de Gran Bretaña y luego se extendió a gran parte de Europa occidental y América Anglosajona.",
      "La invención de la <key>máquina de vapor</key> por James Watt fue el catalizador principal de este cambio sin precedentes.",
      "Marcó el paso de una economía basada en la agricultura y el trabajo manual a una dominada por la <key>industria</key> y la manufactura."
    ],
    simplified: [
      "Fue la época en la que el mundo empezó a usar <key>máquinas</key> para hacer el trabajo que antes hacían las personas.",
      "Todo empezó en Inglaterra hace mucho tiempo, cuando inventaron motores que funcionaban con vapor.",
      "Gracias a esto, se pudieron crear <key>fábricas</key> gigantes y trenes que viajaban muy rápido.",
      "La gente dejó el campo para ir a trabajar a las nuevas ciudades industriales."
    ]
  },
  '4': {
    title: 'Sintaxis Básica de Python',
    content: [
      "Python es un lenguaje de programación de <key>alto nivel</key>, conocido por su legibilidad y simplicidad sintáctica.",
      "Las <key>variables</key> en Python no requieren una declaración de tipo explícita, lo que lo hace dinámico y flexible.",
      "La <key>indentación</key> no es solo por estética; en Python es obligatoria para definir bloques de código.",
      "Utiliza funciones integradas como <key>print()</key> para mostrar información en la consola de manera inmediata."
    ],
    simplified: [
      "Python es como darle instrucciones a la computadora en un lenguaje muy parecido al <key>inglés</key>.",
      "Puedes guardar información en cajitas llamadas <key>variables</key> sin complicaciones.",
      "Para que Python te entienda, debes dejar espacios (sangría) al principio de algunas líneas.",
      "Si quieres que la computadora te diga algo, solo usas el comando <key>print</key>."
    ]
  }
}

export default function Lesson() {
  const navigate = useNavigate()
  const { courseId, nodeId } = useParams()
  const { role } = useAuth()
  const isTeacher = role === 'teacher'
  const [dbNode, setDbNode] = useState(null)
  const [dbLoading, setDbLoading] = useState(true)

  const fallbackData = COURSE_CONTENT[courseId] || COURSE_CONTENT['1']

  // Carga nodo desde la DB
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
      const found = (nodes || []).find((n) => String(n.position) === String(nodeId) || String(n.id) === String(nodeId))
      if (found?.content) {
        setDbNode(found)
        setDbLoading(false)
        return
      }
      // Sin contenido -> pedir a generate-lesson via SSE
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
        title: dbNode.title || fallbackData.title,
        content: splitContent(dbNode.content),
        simplified: fallbackData.simplified,
      }
    : fallbackData

  const [content, setContent] = useState(lessonData.content)
  const [progress, setProgress] = useState(0)
  const [readIndex, setReadIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState(['', '', '', ''])
  const [skip, setSkip] = useState(false)
  const [isTooltipOpen, setTooltip] = useState(null)

  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: '¡Hola! Soy tu asistente de aprendizaje. ¿Hay algo de esta lección que te gustaría que te explique mejor?' }
  ])
  const [inputText, setInputText] = useState('')
  const [chatStreaming, setChatStreaming] = useState(false)
  const [isAiEnhanced, setIsAiEnhanced] = useState(false)
  const chatEndRef = useRef(null)
  const chatAbortRef = useRef(null)
  const lastAiResponseRef = useRef('')

  useEffect(() => {
    setReadIndex(0)
    setDisplayedText(['','','',''])
    setSkip(false)
    setContent(lessonData.content)
    setProgress(0)
    setIsAiEnhanced(false)
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
        setReadIndex(0)
        setDisplayedText(['','','',''])
        setSkip(false)
        setContent(lessonData.simplified)
      }, 1000)
      return
    }

    if (!isSupabaseConfigured) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Estoy procesando una explicación más detallada sobre ese punto...' }])
      return
    }

    const accessToken = await getAccessToken()
    console.log('[chat] enviando mensaje:', userMsg.slice(0, 60))
    const controller = new AbortController()
    chatAbortRef.current = controller
    setChatStreaming(true)
    setMessages(prev => [...prev, { role: 'ai', text: '' }])

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ courseId, message: userMsg, history: messages.slice(-6) }),
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
          if (payload === '[DONE]') {
            console.log('[chat] stream finalizado')
            continue
          }
          try {
            const parsed = JSON.parse(payload)
            if (typeof parsed.text === 'string') {
              chunkCount++
              acc += parsed.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'ai', text: acc }
                return copy
              })
            } else {
              console.warn('[chat] chunk sin text:', parsed)
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
    navigate(`/roadmap/${courseId}`)
  }

  return (
    <PageWrapper className="lesson-page">
      <header className="lesson-header">
        <button className="icon-btn" onClick={() => navigate(`/roadmap/${courseId}`)}><ArrowLeft size={18}/></button>
        <div className="lesson-title-wrap">
          <span className="lesson-subtitle">Curso {courseId} • Lección</span>
          <h1 className="lesson-title">{lessonData.title}</h1>
        </div>
        <button className="icon-btn" title="Narración de voz"><Volume2 size={18}/></button>
      </header>

      <main className="lesson-content">
        <div className="lesson-text-container">
          {content === lessonData.simplified && (
            <div className="ai-feedback-badge animate-fadeInUp" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '8px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14}/> Contenido simplificado por la IA
            </div>
          )}
          {isAiEnhanced && content !== lessonData.simplified && (
            <div className="ai-feedback-badge animate-fadeInUp" style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8', padding: '8px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
              <span><Sparkles size={14}/> Contenido mejorado por el Tutor IA</span>
              <button
                className="icon-btn sm"
                onClick={() => {
                  setIsAiEnhanced(false)
                  setContent(lessonData.content)
                  setReadIndex(0)
                  setDisplayedText(lessonData.content.map(() => ''))
                  setSkip(false)
                  setProgress(0)
                }}
                title="Restaurar contenido original"
                style={{ color: '#818CF8', background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
              >
                <RefreshCw size={12}/> Original
              </button>
            </div>
          )}
          {displayedText.map((html, i) => (
            <p key={i} className="lesson-paragraph" dangerouslySetInnerHTML={{ __html: html }} />
          ))}
          {!skip && readIndex < content.length && (
            <button className="btn btn-ghost skip-btn" onClick={() => setSkip(true)}>
              <FastForward size={16}/> Saltar animación
            </button>
          )}
        </div>
      </main>

      <footer className="lesson-footer">
        <div className="lesson-progress-row">
          <div className="progress-bar" style={{flex:1}}><div className="progress-fill" style={{width:`${progress}%`}}/></div>
          <span className="progress-lbl">{Math.round(progress)}% completado</span>
        </div>
        <button className="btn btn-primary btn-lg" disabled={progress < 75} onClick={handleFinishNode}>
          Terminar Nodo
        </button>
      </footer>

      {showChat && (
        <div className="ai-chat-window">
          <div className="chat-header">
            <h3><Bot size={18}/> Tutor IA</h3>
            <button className="icon-btn sm" onClick={() => setShowChat(false)}><X size={14}/></button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-msg ${m.role}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text || '').replace(/\n/g, '<br/>') }}
              />
            ))}
            {chatStreaming && (
              <div className="chat-msg ai chat-typing">
                <LoaderCircle size={14} className="animate-spin" /> pensando...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder="Pregunta algo..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !chatStreaming && handleSendChat()}
              disabled={chatStreaming}
            />
            <button className="chat-send" onClick={handleSendChat} disabled={chatStreaming}>
              {chatStreaming ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16}/>}
            </button>
          </div>
        </div>
      )}
      {!showChat && (
        <button className="ai-chat-trigger" onClick={() => setShowChat(true)}>
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
  // Si viene como markdown o HTML con <p>, dividir en párrafos
  const stripped = String(rawContent)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
  return stripped
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
