import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Volume2, FastForward, Play, Send, Bot, X, Sparkles } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import './Lesson.css'

const DEFAULT_CONTENT = [
  "La <key>membrana plasmática</key> es una estructura vital que delimita la célula, separando su medio interno del entorno externo. No es solo una barrera estática, sino una frontera dinámica y altamente selectiva.",
  "Está compuesta principalmente por una <key>bicapa lipídica</key> de fosfolípidos, donde se insertan proteínas que actúan como canales, receptores y transportadores. Este modelo se conoce como el 'Mosaico Fluido'.",
  "Su función principal es el <key>transporte selectivo</key>: permite el paso de nutrientes esenciales hacia el interior y la expulsión de desechos metabólicos, manteniendo así la homeostasis celular.",
  "Además, la membrana juega un papel crucial en la <key>comunicación celular</key>, detectando señales químicas del exterior y permitiendo que la célula responda adecuadamente a cambios en su entorno."
]

const SIMPLIFIED_CONTENT = [
  "Imagina que la célula es como una pequeña ciudad y la <key>membrana</key> es su muralla protectora.",
  "Esta muralla tiene <key>puertas inteligentes</key> que solo dejan pasar lo que la ciudad necesita, como comida y energía, y sacan la basura.",
  "Está hecha de una capa doble de grasitas especiales que permiten que todo se mueva con suavidad, como si fuera una balsa en el agua.",
  "También tiene 'antenas' para recibir mensajes de otras células vecinas y saber qué está pasando afuera."
]

export default function Lesson() {
  const navigate = useNavigate()
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [progress, setProgress] = useState(0)
  const [readIndex, setReadIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState(['', '', '', ''])
  const [skip, setSkip] = useState(false)
  const [isTooltipOpen, setTooltip] = useState(null)
  
  // AI Chat State
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: '¡Hola! Soy tu asistente de aprendizaje. ¿Hay algo de la teoría que no entiendas o te gustaría que te lo explique de otra forma?' }
  ])
  const [inputText, setInputText] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (skip) {
      setDisplayedText(content.map(t => t.replace(/<key>/g, '<span class="interactive-word">').replace(/<\/key>/g, '</span>')))
      setProgress(100)
      return
    }

    if (readIndex < content.length) {
      const fullText = content[readIndex]
      let currentLength = 0
      
      const interval = setInterval(() => {
        currentLength += 2 // Faster typing for longer text
        let textToShow = fullText.slice(0, currentLength)
        textToShow = textToShow.replace(/<key>/g, '<span class="interactive-word">').replace(/<\/key>/g, '</span>')
        
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

  function handleSendChat() {
    if (!inputText.trim()) return
    const userMsg = inputText.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInputText('')

    // Mock AI Actions
    setTimeout(() => {
      if (userMsg.toLowerCase().includes('no entiendo') || userMsg.toLowerCase().includes('más fácil')) {
        setMessages(prev => [...prev, { role: 'ai', text: 'Entiendo. Voy a simplificar la teoría para que sea más fácil de comprender. ¡Mira el cambio en tiempo real!' }])
        // Dynamic Theory Change
        setTimeout(() => {
          setReadIndex(0)
          setDisplayedText(['','','',''])
          setSkip(false)
          setContent(SIMPLIFIED_CONTENT)
        }, 1500)
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: 'Esa es una excelente pregunta. Estoy procesando una explicación personalizada para ti...' }])
      }
    }, 1000)
  }

  return (
    <PageWrapper className="lesson-page">
      <header className="lesson-header">
        <button className="icon-btn" onClick={() => navigate('/roadmap')}><ArrowLeft size={18}/></button>
        <div className="lesson-title-wrap">
          <span className="lesson-subtitle">Nodo 4 • Teoría Detallada</span>
          <h1 className="lesson-title">La Membrana Plasmática</h1>
        </div>
        <button className="icon-btn" title="Narración de voz"><Volume2 size={18}/></button>
      </header>

      <main className="lesson-content">
        <div className="lesson-text-container">
          {content === SIMPLIFIED_CONTENT && (
            <div className="ai-feedback-badge animate-fadeInUp">
              <Sparkles size={14}/> Teoría adaptada por IA para mejor comprensión
            </div>
          )}
          {displayedText.map((html, i) => (
            <p 
              key={i} 
              className={`lesson-paragraph ${i === readIndex && !skip ? 'typing' : ''}`}
              dangerouslySetInnerHTML={{ __html: html }}
              onClick={(e) => {
                if(e.target.classList.contains('interactive-word')) {
                  setTooltip(e.target.innerText)
                }
              }}
            />
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
          <span className="progress-lbl">{Math.round(progress)}% Leído</span>
        </div>
        <button 
          className="btn btn-primary btn-lg" 
          disabled={progress < 75}
          onClick={() => navigate('/quiz')}
        >
          Ir al Cuestionario <Play size={16}/>
        </button>
      </footer>

      {/* AI Chat Window */}
      {showChat && (
        <div className="ai-chat-window">
          <div className="chat-header">
            <h3><Bot size={18}/> Tutor IA EduApp</h3>
            <button className="icon-btn sm" onClick={() => setShowChat(false)}><X size={14}/></button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <input 
              type="text" className="chat-input" placeholder="Pregunta algo..." 
              value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
            />
            <button className="chat-send" onClick={handleSendChat}><Send size={16}/></button>
          </div>
        </div>
      )}

      {/* AI Chat Trigger */}
      <button className="ai-chat-trigger animate-bounce" onClick={() => setShowChat(!showChat)}>
        <Bot size={28} />
      </button>

      {/* Word Tooltip Modal */}
      {isTooltipOpen && (
        <div className="word-modal-overlay" onClick={() => setTooltip(null)}>
          <div className="word-modal card" onClick={e => e.stopPropagation()}>
            <h3 className="word-title">{isTooltipOpen}</h3>
            <p className="word-def"><strong>Definición IA:</strong> Concepto biológico clave adaptado a tu nivel actual de comprensión. Representa un pilar fundamental en la biología celular.</p>
            <div className="word-actions">
              <button className="btn btn-ghost btn-sm"><Volume2 size={14}/> Escuchar</button>
              <button className="btn btn-accent btn-sm">Ejemplo visual 🧠</button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
