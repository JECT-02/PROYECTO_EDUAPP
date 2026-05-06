import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, MessageSquare, ExternalLink, Play } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Review.css'

export default function Review() {
  const navigate = useNavigate()
  const [hubOpen, setHubOpen] = useState(false)
  const [analogyType, setAnalogyType] = useState('Como si tuviera 5 años')

  return (
    <PageWrapper className="review-page">
      <header className="review-header">
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 className="review-title">Corrección Cognitiva</h1>
        <div style={{width: 38}} />
      </header>

      <main className="review-content">
        <div className="review-container">
          {/* Question context */}
          <div className="card review-q-card">
            <h3 className="rq-title">Pregunta original</h3>
            <p className="rq-text">¿Cuál es el orgánulo responsable de la generación de energía en la célula eucariota?</p>
            <div className="rq-answer incorrect">
              <span className="lbl">Tu respuesta:</span>
              <span className="val">El Núcleo</span>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card ai-analysis-card">
            <div className="ai-header">
              <Mascot type="owl" size="sm" mood="normal" />
              <div>
                <h3 className="ai-title">Análisis de la IA</h3>
                <span className="ai-concept">Concepto confundido: Función nuclear vs mitocondrial</span>
              </div>
            </div>
            <div className="ai-body">
              <p>Parece que confundiste el <strong>Núcleo</strong> con la <strong>Mitocondria</strong>.</p>
              <p>Recuerda: El núcleo es como el "cerebro" o la "biblioteca" que guarda la información (ADN), pero no genera energía. La encargada de producir energía (ATP) es la mitocondria.</p>
            </div>
            <div className="ai-source">
              <BookOpen size={14} /> Fuente: Material de clase "La Célula v2" (Pág 4)
            </div>
          </div>

          {!hubOpen ? (
            <div className="review-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/roadmap')}>
                ¡Entendido! <ArrowLeft style={{transform:'rotate(180deg)'}} size={18}/>
              </button>
              <button className="btn btn-accent btn-lg" onClick={() => setHubOpen(true)}>
                Aún no entiendo 🤔
              </button>
            </div>
          ) : (
            /* Hub de Refuerzo Multifuente */
            <div className="card hub-card animate-fadeInUp">
              <h2 className="hub-title">Hub de Refuerzo Multifuente</h2>
              
              <div className="hub-section">
                <h4 className="hub-sub"><MessageSquare size={16}/> 1. Analogía IA</h4>
                <select 
                  className="input-field" 
                  value={analogyType}
                  onChange={(e) => setAnalogyType(e.target.value)}
                  style={{marginBottom: 12}}
                >
                  <option>Explicación estándar</option>
                  <option>Como si tuviera 5 años</option>
                  <option>Con videojuegos</option>
                  <option>Con cocina</option>
                </select>
                <div className="analogy-box">
                  {analogyType === 'Como si tuviera 5 años' ? 
                    "Imagina que la célula es una ciudad. La mitocondria es la planta de energía que da electricidad a todas las casas. El núcleo es la oficina del alcalde, donde se guardan las reglas de la ciudad." : 
                    "Piensa en tu consola. La mitocondria es la fuente de poder enchufada a la pared, dando energía. El núcleo es el disco duro con todos los juegos guardados."}
                </div>
              </div>

              <div className="hub-section">
                <h4 className="hub-sub"><Play size={16}/> 2. Video Recomendado</h4>
                <div className="video-card">
                  <div className="video-thumb">▶</div>
                  <div className="video-info">
                    <div className="v-title">Mitocondrias vs Núcleo</div>
                    <div className="v-time">Clip: 02:15 - 04:30</div>
                  </div>
                  <ExternalLink size={16} color="var(--text-muted)"/>
                </div>
              </div>

              <button className="btn btn-primary full-w" onClick={() => navigate('/roadmap')}>
                Ahora sí entendí
              </button>
            </div>
          )}
        </div>
      </main>
    </PageWrapper>
  )
}
