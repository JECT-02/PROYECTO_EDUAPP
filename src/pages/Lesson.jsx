import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Volume2, FastForward, Check, Send, Bot, X, Sparkles } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
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
  const lessonData = COURSE_CONTENT[courseId] || COURSE_CONTENT['1']
  
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
  const chatEndRef = useRef(null)

  useEffect(() => {
    setReadIndex(0)
    setDisplayedText(['','','',''])
    setSkip(false)
    setContent(lessonData.content)
    setProgress(0)
  }, [courseId, nodeId, lessonData])

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
        currentLength += 2
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

    setTimeout(() => {
      if (userMsg.toLowerCase().includes('no entiendo') || userMsg.toLowerCase().includes('más fácil')) {
        setMessages(prev => [...prev, { role: 'ai', text: 'Entiendo perfectamente. Voy a simplificar los conceptos para ti.' }])
        setTimeout(() => {
          setReadIndex(0)
          setDisplayedText(['','','',''])
          setSkip(false)
          setContent(lessonData.simplified)
        }, 1000)
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: 'Buena pregunta. Estoy procesando una explicación más detallada sobre ese punto...' }])
      }
    }, 1000)
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
        <button className="btn btn-primary btn-lg" disabled={progress < 75} onClick={() => navigate(`/roadmap/${courseId}`)}>
          Terminar Nodo <Check size={16}/>
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
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <input type="text" className="chat-input" placeholder="Pregunta algo..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} />
            <button className="chat-send" onClick={handleSendChat}><Send size={16}/></button>
          </div>
        </div>
      )}
      <button className="ai-chat-trigger animate-bounce" onClick={() => setShowChat(!showChat)}>
        <Bot size={28} />
      </button>
    </PageWrapper>
  )
}
