import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Map, Book, Zap, Puzzle, Trophy, Check, Sparkles } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import './Roadmap.css'

export const COURSE_DATA = {
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

  // Dimensiones mejoradas para llenar el espacio
  const nodeSpacing = 180; // Más espacio vertical
  const pathWidth = 460;   // Más ancho para el zig-zag
  const containerWidth = 1000; // Contenedor más amplio

  // Función de posicionamiento robusta
  function getNodePos(index) {
    const x = Math.sin(index * 1.1) * (pathWidth / 2);
    const y = index * nodeSpacing + 100;
    return { x: containerWidth / 2 + x, y };
  }

  // Generación de camino SVG
  function generateSVGPath(count) {
    if (count <= 0) return "";
    const start = getNodePos(0);
    let d = `M ${start.x} ${start.y}`;
    for (let i = 0; i < count - 1; i++) {
      const current = getNodePos(i);
      const next = getNodePos(i + 1);
      const cp1y = current.y + nodeSpacing / 2;
      const cp2y = next.y - nodeSpacing / 2;
      d += ` C ${current.x} ${cp1y}, ${next.x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  }

  const completedCount = nodes.filter(n => n.status === 'completed' || n.status === 'in_progress').length;

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
              <div className="sync-fill" style={{width:'72%', background:'var(--primary)'}} />
            </div>
            <span className="sync-pct" style={{color:'var(--primary-light)'}}>72%</span>
          </div>
        </div>
        <div className="rm-h-right">
           <button className="icon-btn" title="Mapa del curso"><Map size={18}/></button>
        </div>
      </div>

      <div className="rm-main-container">
        <div className="rm-scroll-area">
          {/* Centrado forzado del contenido */}
          <div className="rm-path-container" style={{ width: containerWidth, height: nodes.length * nodeSpacing + 200, margin: '0 auto', position: 'relative' }}>
            
            {/* SVG Lines - Capa de fondo */}
            <svg className="rm-svg-path" width={containerWidth} height={nodes.length * nodeSpacing + 200} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
              <path
                d={generateSVGPath(nodes.length)}
                fill="none"
                stroke="rgba(108, 99, 255, 0.12)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="20 15"
              />
              <path
                className="active-path"
                d={generateSVGPath(completedCount)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="12"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.5))' }}
              />
            </svg>

            {/* Nodos interactivos */}
            {nodes.map((node, i) => {
              const pos = getNodePos(i);
              return (
                <div 
                  key={node.id} 
                  className={`rm-node-anchor ${node.status}`}
                  style={{ 
                    position: 'absolute',
                    left: pos.x, 
                    top: pos.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20
                  }}
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
                      {node.type === 'theory' ? <Book size={30} /> : 
                       node.type === 'practice' ? <Puzzle size={30} /> : 
                       node.type === 'quiz' ? <Zap size={30} /> : <Trophy size={36} />}
                      
                      {node.status === 'completed' && (
                        <div className="node-check-overlay">
                          <Check size={18} strokeWidth={4} />
                        </div>
                      )}
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
                    <div className="rm-mascot-guide" style={{ position: 'absolute', top: -70, left: 40 }}>
                      <Mascot type="dragon" size="sm" mood="normal" />
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
