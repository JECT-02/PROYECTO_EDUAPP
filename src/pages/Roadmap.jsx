import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Map, Book, Zap, Puzzle, Trophy, Check } from 'lucide-react'
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
    ]
  },
  '3': {
    title: 'Historia del Mundo',
    nodes: [
      { id:1, type:'theory', title:'La Revolución Industrial', status:'completed' },
      { id:2, type:'theory', title:'Guerras Mundiales', status:'in_progress' },
      { id:3, type:'quiz', title:'Examen de Historia', status:'locked' },
    ]
  },
  '4': {
    title: 'Programación Python',
    nodes: [
      { id:1, type:'theory', title:'Sintaxis Básica', status:'available' },
      { id:2, type:'theory', title:'Estructuras de Control', status:'locked' },
      { id:3, type:'quiz', title:'Primeros Pasos en Python', status:'locked' },
    ]
  }
}

export default function Roadmap() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const course = COURSE_DATA[courseId] || COURSE_DATA['1']
  const nodes = course.nodes

  const activeNode = nodes.find(n => n.status === 'in_progress' || n.status === 'available') || nodes[0]

  return (
    <PageWrapper className="roadmap-page-wrap">
      {/* Header Fijo */}
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
              <div className="sync-fill" style={{width:'72%', background:'#3B82F6'}} />
            </div>
            <span className="sync-pct" style={{color:'#60A5FA'}}>72%</span>
          </div>
        </div>
        <div className="rm-h-right">
           <button className="icon-btn" title="Mapa del curso"><Map size={18}/></button>
        </div>
      </div>

      {/* Área del Roadmap (Scroll Vertical) */}
      <div className="rm-canvas-area vertical">
        <div className="rm-scroll-container">
          <div className="rm-vertical-path">
            {nodes.map((node, i) => {
              const isLeft = i % 2 === 0
              return (
                <div key={node.id} className={`rm-node-row ${isLeft ? 'left' : 'right'}`}>
                  <div 
                    className={`rm-node ${node.type} ${node.status}`}
                    onClick={() => {
                      if (node.status !== 'locked') {
                        const path = node.type === 'quiz' ? '/quiz' : node.type === 'boss' ? '/coliseo' : '/lesson'
                        navigate(`${path}/${courseId}/${node.id}`)
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
                  
                  {i < nodes.length - 1 && (
                    <div className={`rm-connector ${isLeft ? 'to-right' : 'to-left'}`}>
                      <svg width="100%" height="100px" preserveAspectRatio="none">
                        <path 
                          d={isLeft ? "M 20 0 Q 20 50, 180 50 T 180 100" : "M 180 0 Q 180 50, 20 50 T 20 100"} 
                          fill="none" 
                          stroke={node.status === 'completed' ? "#FCD34D" : "rgba(255,255,255,0.1)"} 
                          strokeWidth="4"
                          strokeDasharray={node.status === 'completed' ? "0" : "8 8"}
                        />
                      </svg>
                    </div>
                  )}

                  {node.id === activeNode.id && (
                    <div className="rm-mascot-anchor">
                      <Mascot type="dragon" size="sm" mood="normal" message="¡Vamos!" />
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
