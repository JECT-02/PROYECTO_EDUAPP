import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Map, Book, Zap, Puzzle, Trophy, Check, Sparkles } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Roadmap.css'

const COURSE_DATA = {
  '1': {
    title: 'Biología Celular',
    nodes: [
      { id:1, type:'theory', title:'Introducción a la Célula', status:'completed' },
      { id:2, type:'theory', title:'Componentes del Citoplasma', status:'completed' },
      { id:3, type:'quiz', title:'Test de Conceptos Básicos', status:'completed' },
      { id:4, type:'theory', title:'La Membrana Plasmática', status:'in_progress' },
      { id:5, type:'theory', title:'Transporte Pasivo', status:'locked' },
      { id:6, type:'quiz', title:'Prueba de Transporte', status:'locked' },
      { id:7, type:'theory', title:'El Núcleo Celular', status:'locked' },
      { id:8, type:'boss', title:'Certificación de Unidad', status:'locked' },
    ]
  },
  '2': {
    title: 'Matemáticas Avanzadas',
    nodes: [
      { id:1, type:'theory', title:'Límites y Continuidad', status:'in_progress' },
      { id:2, type:'theory', title:'Derivadas Básicas', status:'locked' },
      { id:3, type:'quiz', title:'Quiz de Cálculo', status:'locked' },
      { id:4, type:'theory', title:'Integrales Definidas', status:'locked' },
      { id:5, type:'boss', title:'Examen Final de Cálculo', status:'locked' },
    ]
  },
  '3': {
    title: 'Historia del Mundo',
    nodes: [
      { id:1, type:'theory', title:'La Revolución Industrial', status:'completed' },
      { id:2, type:'theory', title:'Guerras Mundiales', status:'in_progress' },
      { id:3, type:'quiz', title:'Examen de Historia', status:'locked' },
      { id:4, type:'theory', title:'Guerra Fría', status:'locked' },
      { id:5, type:'boss', title:'Certificación Histórica', status:'locked' },
    ]
  },
  '4': {
    title: 'Programación Python',
    nodes: [
      { id:1, type:'theory', title:'Sintaxis Básica', status:'available' },
      { id:2, type:'theory', title:'Estructuras de Control', status:'locked' },
      { id:3, type:'quiz', title:'Primeros Pasos en Python', status:'locked' },
      { id:4, type:'theory', title:'Funciones y Listas', status:'locked' },
      { id:5, type:'boss', title:'Master de Python', status:'locked' },
    ]
  }
}

export default function Roadmap() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const course = COURSE_DATA[courseId] || COURSE_DATA['1']
  const nodes = course.nodes

  const activeNode = nodes.find(n => n.status === 'in_progress' || n.status === 'available') || nodes[0]

  // Configuration for the winding path
  const nodeSpacing = 160;
  const pathWidth = 240; // Max horizontal deviation

  return (
    <PageWrapper className="roadmap-page-wrap">
      <div className="rm-header">
        <div className="rm-h-left">
          <button className="icon-btn" onClick={() => navigate('/dashboard')}><ArrowLeft size={18}/></button>
          <div>
            <h2 className="rm-course-title">{course.title}</h2>
            <div className="rm-progress-bar">
              <div className="rm-progress-fill" style={{width:'37%'}} />
            </div>
          </div>
        </div>
        <div className="rm-h-center hide-mobile">
          <div className="sync-bar-wrap">
            <span className="sync-label">Nivel de entendimiento</span>
            <div className="sync-bar">
              <div className="sync-fill" style={{width:'72%', background:'linear-gradient(90deg, #3B82F6, #8B5CF6)'}} />
            </div>
            <span className="sync-pct">72%</span>
          </div>
        </div>
        <div className="rm-h-right">
           <button className="icon-btn" title="Mapa del curso"><Map size={18}/></button>
        </div>
      </div>

      <div className="rm-main-container">
        <div className="rm-scroll-area">
          <div className="rm-path-container" style={{ height: nodes.length * nodeSpacing + 100 }}>
            {/* SVG Path Background */}
            <svg className="rm-svg-path" width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--primary)" />
                </linearGradient>
              </defs>
              <path
                d={generatePath(nodes.length, nodeSpacing, pathWidth)}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                className="active-path"
                d={generatePath(getCompletedCount(nodes), nodeSpacing, pathWidth)}
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 8px var(--accent-light))' }}
              />
            </svg>

            {/* Nodes Mapping */}
            {nodes.map((node, i) => {
              const pos = getNodePosition(i, nodeSpacing, pathWidth);
              return (
                <div 
                  key={node.id} 
                  className={`rm-node-anchor ${node.status}`}
                  style={{ left: `calc(50% + ${pos.x}px)`, top: pos.y }}
                >
                  <div 
                    className={`rm-node-v2 ${node.type} ${node.status}`}
                    onClick={() => {
                      if (node.status !== 'locked') {
                        const path = node.type === 'quiz' ? '/quiz' : node.type === 'boss' ? '/coliseo' : '/lesson'
                        navigate(`${path}/${courseId}/${node.id}`)
                      }
                    }}
                  >
                    <div className="node-glow" />
                    <div className="node-main">
                      {node.status === 'completed' ? <Check size={24} /> : 
                       node.type === 'theory' ? <Book size={24} /> : 
                       node.type === 'practice' ? <Puzzle size={24} /> : 
                       node.type === 'quiz' ? <Zap size={24} /> : <Trophy size={30} />}
                    </div>
                    
                    <div className="node-info-bubble">
                      <div className="node-type-tag">{node.type.toUpperCase()}</div>
                      <div className="node-title-text">{node.title}</div>
                      {node.status === 'in_progress' && (
                        <div className="node-status-tag"><Sparkles size={10}/> ACTUAL</div>
                      )}
                    </div>
                  </div>

                  {node.id === activeNode.id && (
                    <div className="rm-mascot-guide">
                      <Mascot type="dragon" size="sm" mood="normal" />
                      <div className="guide-bubble">¡Siguiente parada!</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function generatePath(count, spacing, width) {
  if (count <= 0) return "";
  let d = `M 50% 40`;
  for (let i = 0; i < count; i++) {
    const pos = getNodePosition(i, spacing, width);
    const nextPos = getNodePosition(i + 1, spacing, width);
    if (i < count - 1) {
      // Cubic bezier for smooth winding
      const cp1y = pos.y + spacing / 2;
      const cp2y = nextPos.y - spacing / 2;
      d += ` C calc(50% + ${pos.x}px) ${cp1y}, calc(50% + ${nextPos.x}px) ${cp2y}, calc(50% + ${nextPos.x}px) ${nextPos.y}`;
    }
  }
  return d;
}

function getNodePosition(i, spacing, width) {
  const x = Math.sin(i * 1.2) * (width / 2); // Winding effect
  const y = i * spacing + 80;
  return { x, y };
}

function getCompletedCount(nodes) {
  const lastCompleted = [...nodes].reverse().findIndex(n => n.status === 'completed' || n.status === 'in_progress');
  if (lastCompleted === -1) return 1;
  return nodes.length - lastCompleted;
}
