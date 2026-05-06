import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Volume2, FastForward, Play } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Lesson.css'

const CONTENT = [
  "La célula es la unidad morfológica y funcional de todo ser vivo. De hecho, la célula es el elemento de menor tamaño que puede considerarse vivo.",
  "Existen dos grandes tipos de células: las <key>procariotas</key>, que no tienen un núcleo definido, y las <key>eucariotas</key>, que sí lo tienen y son mucho más complejas.",
  "En las células eucariotas, el ADN está confinado dentro del núcleo, rodeado por una membrana. Además, cuentan con diversos orgánulos, como las mitocondrias, que actúan como <key>motores de energía</key>."
]

export default function Lesson() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0) // 0 to 100
  const [readIndex, setReadIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState(['', '', ''])
  const [skip, setSkip] = useState(false)
  const [isTooltipOpen, setTooltip] = useState(null)

  useEffect(() => {
    if (skip) {
      setDisplayedText(CONTENT.map(t => t.replace(/<key>/g, '<span class="interactive-word">').replace(/<\/key>/g, '</span>')))
      setProgress(100)
      return
    }

    if (readIndex < CONTENT.length) {
      const fullText = CONTENT[readIndex]
      let currentLength = 0
      
      const interval = setInterval(() => {
        currentLength += 1
        let textToShow = fullText.slice(0, currentLength)
        
        // Handle tags loosely for demo
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
            setProgress(((readIndex + 1) / CONTENT.length) * 100)
          }, 800)
        }
      }, 30) // Typewriter speed

      return () => clearInterval(interval)
    }
  }, [readIndex, skip])

  return (
    <PageWrapper className="lesson-page">
      {/* Header Fijo */}
      <header className="lesson-header">
        <button className="icon-btn" onClick={() => navigate('/roadmap')}><ArrowLeft size={18}/></button>
        <div className="lesson-title-wrap">
          <span className="lesson-subtitle">Nodo 4 • Teoría</span>
          <h1 className="lesson-title">La Membrana Plasmática</h1>
        </div>
        <button className="icon-btn" title="Narración de voz"><Volume2 size={18}/></button>
      </header>

      {/* Contenido */}
      <main className="lesson-content">
        <div className="lesson-text-container">
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

          {!skip && readIndex < CONTENT.length && (
            <button className="btn btn-ghost skip-btn" onClick={() => setSkip(true)}>
              <FastForward size={16}/> Saltar animación
            </button>
          )}
        </div>
      </main>

      {/* Footer / Siguiente */}
      <footer className="lesson-footer">
        <div className="lesson-progress-row">
          <div className="progress-bar" style={{flex:1}}><div className="progress-fill" style={{width:`${progress}%`}}/></div>
          <span className="progress-lbl">{Math.round(progress)}% Leído</span>
        </div>
        <button 
          className="btn btn-primary btn-lg" 
          disabled={progress < 80}
          onClick={() => navigate('/quiz')}
        >
          Ir al Cuestionario <Play size={16}/>
        </button>
      </footer>

      {/* Word Tooltip Modal (Demo) */}
      {isTooltipOpen && (
        <div className="word-modal-overlay" onClick={() => setTooltip(null)}>
          <div className="word-modal card" onClick={e => e.stopPropagation()}>
            <h3 className="word-title">{isTooltipOpen}</h3>
            <p className="word-def"><strong>Definición IA:</strong> Concepto biológico clave relacionado con la estructura celular adaptada a sus funciones específicas de supervivencia.</p>
            <div className="word-actions">
              <button className="btn btn-ghost btn-sm"><Volume2 size={14}/> Escuchar</button>
              <button className="btn btn-accent btn-sm">Generar ejemplo 🧠</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mascot Assistant */}
      <div className="lesson-mascot">
        <Mascot type="robot" size="sm" mood="normal" />
      </div>
    </PageWrapper>
  )
}
