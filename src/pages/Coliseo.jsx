import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShieldAlert, Swords, X } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Coliseo.css'

export default function Coliseo() {
  const navigate = useNavigate()
  const [started, setStarted] = useState(false)
  const [lives, setLives] = useState(3)
  const [qIndex, setQIndex] = useState(0)
  const [status, setStatus] = useState('idle')

  const totalQ = 5

  if (!started) {
    return (
      <PageWrapper className="coliseo-page center-all">
        <div className="card coliseo-intro">
          <button className="icon-btn close-arena" onClick={() => navigate('/dashboard')} title="Salir del Coliseo">
            <X size={20} />
          </button>
          <div className="coliseo-icon-epic animate-pulse-glow">👑</div>
          <h1 className="gradient-text">Coliseo de Retos</h1>
          <p>Examen Final: Biología Celular</p>
          <ul className="coliseo-rules">
            <li><Swords size={16}/> 20 preguntas adaptativas</li>
            <li><ShieldAlert size={16}/> 30 minutos. NO se puede pausar.</li>
            <li><Heart size={16} color="#EF4444"/> 3 Vidas. Cada error resta una.</li>
          </ul>
          <div className="coliseo-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/roadmap')}>Volver al mapa</button>
            <button className="btn btn-accent btn-lg" onClick={() => setStarted(true)}>¡Entrar a la Arena!</button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  function handleSelect(correct) {
    if (status !== 'idle') return
    if (correct) {
      setStatus('correct')
      setTimeout(() => {
        if (qIndex + 1 < totalQ) { setQIndex(qIndex + 1); setStatus('idle') }
        else navigate('/achievements') // Victory!
      }, 1500)
    } else {
      setStatus('incorrect')
      setLives(l => l - 1)
      setTimeout(() => {
        if (lives - 1 <= 0) navigate('/roadmap') // Game over
        else { setQIndex(qIndex + 1); setStatus('idle') }
      }, 1500)
    }
  }

  return (
    <PageWrapper className="coliseo-page in-game">
      <header className="coliseo-header">
        <button className="icon-btn exit-btn" onClick={() => navigate('/dashboard')} title="Abandonar arena">
          <X size={18} />
        </button>
        <div className="coliseo-progress">Ronda {qIndex + 1} / {totalQ}</div>
        <div className="coliseo-timer">29:55</div>
        <div className="coliseo-lives">
          {Array.from({length: 3}).map((_, i) => (
             <Heart key={i} size={24} fill={i < lives ? '#EF4444' : 'transparent'} color={i < lives ? '#EF4444' : '#6B6D8A'} />
          ))}
        </div>
      </header>

      <main className="coliseo-main">
        <div className="coliseo-arena">
          <Mascot type="dragon" mood={status==='incorrect'?'sad':status==='correct'?'happy':'normal'} size="lg" />
          <div className="card coliseo-q-card">
            <h2>¿Qué estructura celular es análoga a una central de procesamiento de empaques?</h2>
            <div className="quiz-options">
              <button className={`quiz-opt-btn ${status==='incorrect'?'disabled':''}`} onClick={() => handleSelect(false)}>
                <span className="opt-letter">A</span><span className="opt-text">El Núcleo</span>
              </button>
              <button className={`quiz-opt-btn ${status==='correct'?'correct':''}`} onClick={() => handleSelect(true)}>
                <span className="opt-letter">B</span><span className="opt-text">Aparato de Golgi</span>
              </button>
              <button className={`quiz-opt-btn ${status==='incorrect'?'disabled':''}`} onClick={() => handleSelect(false)}>
                <span className="opt-letter">C</span><span className="opt-text">Lisosoma</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </PageWrapper>
  )
}
