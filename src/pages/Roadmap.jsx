import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Map, Book, Zap, Puzzle, Trophy, Check } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Roadmap.css'

const NODES = [
  { id:1, type:'theory', title:'Introducción a la Célula', status:'completed', x:50, y:80 },
  { id:2, type:'theory', title:'Componentes del Citoplasma', status:'completed', x:150, y:180 },
  { id:3, type:'quiz', title:'Test de Conceptos Básicos', status:'completed', x:280, y:120 },
  { id:4, type:'theory', title:'La Membrana Plasmática', status:'in_progress', x:400, y:220 },
  { id:5, type:'theory', title:'Transporte Pasivo', status:'locked', x:550, y:140 },
  { id:6, type:'quiz', title:'Prueba de Transporte', status:'locked', x:680, y:240 },
  { id:7, type:'theory', title:'El Núcleo Celular', status:'locked', x:800, y:100 },
  { id:8, type:'boss', title:'Certificación de Unidad', status:'locked', x:950, y:200 },
]

export default function Roadmap() {
  const navigate = useNavigate()

  const activeNode = NODES.find(n => n.status === 'in_progress' || n.status === 'available') || NODES[0]

  return (
    <PageWrapper className="roadmap-page-wrap">
      {/* Header Fijo */}
      <div className="rm-header">
        <div className="rm-h-left">
          <button className="icon-btn" onClick={() => navigate('/dashboard')}><ArrowLeft size={18}/></button>
          <div>
            <h2 className="rm-course-title">Biología Celular</h2>
            <div className="rm-progress-bar">
              <div className="rm-progress-fill" style={{width:'37%'}} />
            </div>
          </div>
        </div>
        <div className="rm-h-center hide-mobile">
          <div className="sync-bar-wrap">
            <span className="sync-label">Nivel de entendimiento</span>
            <div className="sync-bar">
              <div className="sync-fill" style={{width:'72%', background:'#3B82F6'}} />
            </div>
            <span className="sync-pct" style={{color:'#60A5FA'}}>72%</span>
          </div>
        </div>
        <div className="rm-h-right">
           <button className="icon-btn" title="Mapa del curso"><Map size={18}/></button>
        </div>
      </div>

      {/* Área del Roadmap (Scroll/Pan) */}
      <div className="rm-canvas-area">
        <div className="rm-scroll-container">
          <div className="rm-map-content" style={{ width: 1100, height: 400 }}>
            {/* SVG Lines */}
            <svg className="rm-lines-svg">
              <path 
                d="M 50 80 Q 100 130 150 180 T 280 120 T 400 220"
                fill="none" stroke="#FCD34D" strokeWidth="4" className="path-completed"
              />
              <path 
                d="M 400 220 Q 475 180 550 140 T 680 240 T 800 100 T 950 200"
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeDasharray="8 8"
              />
            </svg>

            {/* Nodes */}
            {NODES.map(node => (
              <div 
                key={node.id}
                className={`rm-node ${node.type} ${node.status}`}
                style={{ left: node.x, top: node.y }}
                onClick={() => {
                  if (node.status !== 'locked') {
                    navigate(node.type === 'quiz' ? '/quiz' : node.type === 'boss' ? '/coliseo' : '/lesson')
                  }
                }}
              >
                <div className="rm-node-circle">
                  {node.status === 'completed' ? <Check size={20} /> : 
                   node.type === 'theory' ? <Book size={20} /> : 
                   node.type === 'practice' ? <Puzzle size={20} /> : 
                   node.type === 'quiz' ? <Zap size={20} /> : <Trophy size={24} />}
                </div>
                <div className="rm-node-label">{node.title}</div>
              </div>
            ))}

            {/* Mascot position */}
            <div 
              className="rm-mascot-overlay animate-float"
              style={{ left: activeNode.x + 30, top: activeNode.y - 70 }}
            >
              <Mascot type="dragon" size="sm" mood="normal" message="¡Vamos por este nodo!" />
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
