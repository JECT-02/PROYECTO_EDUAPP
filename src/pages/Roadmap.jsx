import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Book, Zap, Puzzle, Trophy, Sparkles, Edit3, Eye, LoaderCircle } from 'lucide-react'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { vibrateLocked } from '../utils/vibration'
import { getCourseWithNodes, getCourseNodes, getCourseNodesAllStatus, getStudentEnrollments, getProgressForEnrollment, isSupabaseConfigured } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import './Roadmap.css'

export default function Roadmap() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { studentId, role } = useAuth()
  const isTeacher = role === 'teacher'
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes] = useState([])
  const [courseTitle, setCourseTitle] = useState('Cargando...')
  const [errorMsg, setErrorMsg] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setErrorMsg('')
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }
      try {
        const { data: courseData } = await getCourseWithNodes(courseId)
        if (cancelled) return
        setCourseTitle(courseData?.title || 'Curso')

        const nodesFn = isTeacher ? getCourseNodesAllStatus : getCourseNodes
        const { data, error } = await nodesFn(courseId)
        if (cancelled) return
        if (error) throw error
        if (!data || data.length === 0) {
          setNodes([])
          setLoading(false)
          setErrorMsg('Este curso aún no tiene nodos en el roadmap.')
          return
        }

        let mapped = data.map((n) => ({
          id: n.id,
          position: n.position,
          type: n.type,
          title: n.title,
          status: n.status === 'published' ? ('available') : (isTeacher ? 'available' : 'locked'),
        }))

        if (!isTeacher) {
          const { data: enr } = await getStudentEnrollments(studentId)
          if (!cancelled) {
            const enrollment = (enr || []).find((e) => e.course_id === courseId || String(e.course_id) === String(courseId))
            let progressRows = []
            if (enrollment) {
              const { data: prog } = await getProgressForEnrollment(enrollment.id)
              progressRows = prog || []
            }
            const completedPositions = new Set()
            for (const n of mapped) {
              const row = progressRows.find((p) => p.node_id === n.id)
              if (row?.state === 'completed') completedPositions.add(n.position)
            }
            let firstUnlocked = true
            for (const n of mapped) {
              const isCompleted = completedPositions.has(n.position)
              const prevCompleted = completedPositions.has(n.position - 1)
              if (isCompleted) {
                n.status = 'completed'
              } else if (n.position === 1 || prevCompleted) {
                n.status = firstUnlocked ? 'in_progress' : 'available'
                firstUnlocked = false
              } else {
                n.status = 'locked'
              }
            }
          }
        }
        if (!cancelled) {
          setNodes(mapped)
          setLoading(false)
        }
      } catch (e) {
        console.error('[roadmap] error:', e)
        if (!cancelled) {
          setErrorMsg('Error al cargar el roadmap. Verifica tu conexión.')
          setNodes([])
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, studentId, isTeacher])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const activeNode = nodes.find(n => n.status === 'in_progress' || n.status === 'available') || nodes[0] || null

  const nodeSpacing = isMobile ? 110 : 180
  const pathWidth = isMobile ? 120 : 460
  const containerWidth = isMobile ? 340 : 1000
  const nodeSize = isMobile ? 64 : 90
  const iconSize = isMobile ? 20 : 30
  const bossIconSize = isMobile ? 26 : 36
  const mascotOffset = isMobile ? -55 : -70

  function getNodePos(index) {
    const x = Math.sin(index * 1.1) * (pathWidth / 2)
    const y = index * nodeSpacing + 100
    return { x: containerWidth / 2 + x, y }
  }

  function generateSVGPath(count) {
    if (count <= 0) return ''
    const start = getNodePos(0)
    let d = `M ${start.x} ${start.y}`
    for (let i = 0; i < count - 1; i++) {
      const current = getNodePos(i)
      const next = getNodePos(i + 1)
      const cp1y = current.y + nodeSpacing / 2
      const cp2y = next.y - nodeSpacing / 2
      d += ` C ${current.x} ${cp1y}, ${next.x} ${cp2y}, ${next.x} ${next.y}`
    }
    return d
  }

  const completedCount = nodes.filter(n => n.status === 'completed' || n.status === 'in_progress').length
  const progressPercent = nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0

  return (
    <PageWrapper className="roadmap-page-wrap">
      <div className="rm-header">
        <div className="rm-h-left">
          <button className="icon-btn" onClick={() => navigate(isTeacher ? '/teacher' : '/dashboard')} aria-label="Volver al inicio"><ArrowLeft size={18} aria-hidden="true"/></button>
          <div>
            <h2 className="rm-course-title">{courseTitle}</h2>
            <div className="rm-progress-row">
              <div className="rm-progress-bar">
                <div className="rm-progress-fill" style={{width: `${progressPercent}%`}} />
              </div>
              <span className="rm-progress-pct">{progressPercent}%</span>
            </div>
          </div>
        </div>
        {isTeacher && (
          <div className="rm-h-right" style={{display:'flex', gap:8}}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/teacher/design/${courseId}`)}>
              <Edit3 size={14}/> Editar Roadmap
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/teacher/courses/${courseId}/review`)}>
              <Eye size={14}/> Revisar Contenido
            </button>
          </div>
        )}
      </div>

      <div className="rm-main-container">
        <div className="rm-scroll-area">
          <nav aria-label="Mapa de aprendizaje">
          {/* Lista semántica para lectores de pantalla */}
          <ol className="visually-hidden" aria-label="Lista de nodos del curso">
            {nodes.map((n, i) => {
              const statusMap = { completed: 'completado', in_progress: 'en progreso', available: 'disponible', locked: 'bloqueado' }
              const typesMap = { theory: 'teoría', quiz: 'cuestionario', boss: 'examen final', practice: 'práctica' }
              return (
                <li key={n.id}>
                  Nodo {i + 1}: {n.title}. Tipo: {typesMap[n.type] || n.type}. Estado: {statusMap[n.status] || n.status}
                </li>
              )
            })}
          </ol>
          <div className="rm-path-container" style={{ width: containerWidth, height: Math.max(nodes.length, 1) * nodeSpacing + 200 }}>

            {errorMsg && (
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--text-muted)' }} role="status">
                <p>{errorMsg}</p>
              </div>
            )}

            {loading && (
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }} role="status" aria-live="polite">
                <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> Cargando roadmap...
              </div>
            )}

            {!loading && !errorMsg && nodes.length === 0 && (
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--text-muted)' }} role="status">
                <p>Este curso aún no tiene nodos en el roadmap.</p>
                {isTeacher && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/teacher/design/${courseId}`)} style={{ marginTop: 12 }}>
                    <Edit3 size={14}/> Diseñar Roadmap
                  </button>
                )}
              </div>
            )}

            {nodes.length > 0 && (
              <>
                <svg className="rm-svg-path" width={containerWidth} height={nodes.length * nodeSpacing + 200} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} role="img" aria-label={`Mapa del curso con ${nodes.length} nodos`}>
                  <path
                    d={generateSVGPath(nodes.length)}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="3 22"
                  />
                  <path
                    className="active-path"
                    d={generateSVGPath(Math.max(completedCount, 1))}
                    fill="none"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="3 22"
                  />
                </svg>

                {nodes.map((node, i) => {
                  const pos = getNodePos(i)
                  const nodeLabel = `Nodo ${i + 1}: ${
                    { theory: 'Lección de teoría', quiz: 'Cuestionario', boss: 'Examen final', practice: 'Práctica' }[node.type] || node.type
                  }: ${node.title}. ${
                    { completed: 'Completado', in_progress: 'En progreso', available: 'Disponible', locked: 'Bloqueado' }[node.status] || node.status
                  }`
                  return (
                    <div
                      key={node.id}
                      className={`rm-node-anchor ${node.status}`}
                      style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', zIndex: 20 }}
                    >
                      <div
                        className={`rm-node-v2 ${node.type} ${node.status} ${isMobile ? 'mobile' : ''}`}
                        style={{ width: nodeSize, height: nodeSize }}
                        role="button"
                        tabIndex={node.status === 'locked' ? -1 : 0}
                        aria-label={nodeLabel}
                        aria-disabled={node.status === 'locked'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            e.preventDefault()
                            if (node.status !== 'locked') {
                              const path = node.type === 'quiz' ? '/quiz' : node.type === 'boss' ? '/coliseo' : '/lesson'
                              navigate(`${path}/${courseId}/${node.position || node.id}`)
                            }
                          }
                        }}
                        onClick={() => {
                          if (node.status !== 'locked') {
                            const path = node.type === 'quiz' ? '/quiz' : node.type === 'boss' ? '/coliseo' : '/lesson'
                            navigate(`${path}/${courseId}/${node.position || node.id}`)
                          } else {
                            vibrateLocked()
                          }
                        }}
                      >
                        <div className="node-glow" aria-hidden="true" />
                        <div className="node-main" aria-hidden="true">
                          {node.type === 'theory' ? <Book size={iconSize} /> :
                           node.type === 'practice' ? <Puzzle size={iconSize} /> :
                           node.type === 'quiz' ? <Zap size={iconSize} /> : <Trophy size={bossIconSize} />}
                        </div>
                        <div className="node-info-bubble">
                          <div className="node-type-tag">{node.type.toUpperCase()}</div>
                          <div className="node-title-text">{node.title}</div>
                          {node.status === 'in_progress' && (
                            <div className="node-status-tag"><Sparkles size={10}/> ACTUAL</div>
                          )}
                        </div>
                      </div>
                      {activeNode && node.id === activeNode.id && (
                        <div className="rm-mascot-guide" style={{ position: 'absolute', top: mascotOffset, left: isMobile ? 30 : 40 }} aria-hidden="true">
                          <Mascot type="dragon" size="sm" mood="normal" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
          </nav>
        </div>
      </div>

      <div className="sync-float">
        <div className="sync-float-inner">
          <span className="sync-float-label">Nivel de entendimiento</span>
          <div className="sync-float-bar">
            <div className="sync-float-fill" style={{width:'72%', background:'var(--primary)'}} />
          </div>
          <span className="sync-float-pct" style={{color:'var(--primary-light)'}}>72%</span>
        </div>
      </div>
    </PageWrapper>
  )
}
