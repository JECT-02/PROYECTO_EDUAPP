import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Book, Zap, Puzzle, Trophy, Sparkles, Send, Bot, LoaderCircle, Save, Trash2, Eye, Check } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { getCourseWithNodes, getCourseNodesAllStatus, approveAllNodes, isSupabaseConfigured } from '../lib/api'
import { generateRoadmapAI } from '../lib/ai-client'
import { getAccessToken } from '../lib/supabase'
import '../pages/Roadmap.css'

const NODE_TYPES = ['theory', 'practice', 'quiz', 'boss', 'reward']
const TYPE_ICON = { theory: <Book size={18} />, practice: <Puzzle size={18} />, quiz: <Zap size={18} />, boss: <Trophy size={28} />, reward: <Sparkles size={18} /> }
const TYPE_COLORS = { theory: '#6C63FF', practice: '#22C55E', quiz: '#F59E0B', boss: '#EF4444', reward: '#EC4899' }

export default function RoadmapDesigner() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [messages, setMessages] = useState([
    { role: 'ai', text: '¡Hola! Soy tu asistente para diseñar el roadmap. Puedes pedirme agregar, quitar o modificar nodos. Por ejemplo: "Agrega un quiz después del nodo 3" o "Cambia el nodo 2 a práctica".' }
  ])
  const [inputText, setInputText] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured) { setLoading(false); return }
      setLoading(true)
      setError('')
      try {
        const { data, error: err } = await getCourseNodesAllStatus(courseId)
        if (cancelled) return
        if (err) throw err
        if (data && data.length > 0) {
          setNodes(data.sort((a, b) => a.position - b.position))
        }
      } catch (e) {
        if (!cancelled) setError('Error al cargar nodos: ' + e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: e } = await approveAllNodes(courseId, nodes)
      if (e) throw e
      setSuccess('Roadmap publicado exitosamente')
      setTimeout(() => navigate(`/roadmap/${courseId}`), 1500)
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setMessages(prev => [...prev, { role: 'user', text: 'Genera el roadmap inicial del curso basado en los archivos subidos.' }])
    try {
      // Load course data first
      const { data: courseData } = await getCourseWithNodes(courseId)
      if (!courseData) throw new Error('No se pudo cargar el curso')

      const res = await generateRoadmapAI({
        title: courseData.title || 'Curso sin titulo',
        description: courseData.description || '',
        category: courseData.category || '',
        level: courseData.level || 'general',
        rigor: 3,
        fileTexts: [],
      })
      if (res?.error) throw new Error(res.error)
      let generatedNodes = []
      if (res?.nodes) {
        generatedNodes = res.nodes.sort((a, b) => a.position - b.position)
        setMessages(prev => [...prev, { role: 'ai', text: `Roadmap generado con ${generatedNodes.length} nodos y contenido completo. Puedes revisar cada nodo o pedirme cambios.` }])
      } else {
        throw new Error('No se generaron nodos')
      }
      setNodes(generatedNodes)
    } catch (err) {
      setError('Error al generar roadmap: ' + err.message)
      setMessages(prev => [...prev, { role: 'ai', text: `Lo siento, no pude generar el roadmap. ${err.message.includes('503') ? 'La función de generación tuvo un problema al iniciar. Intenta recargar la página y vuelve a intentarlo.' : err.message.includes('401') ? 'Tu sesión expiró. Recarga la página e inicia sesión de nuevo.' : 'Verifica que hayas subido archivos de referencia (PDF, DOCX, TXT) al curso.'}` }])
    } finally {
      setGenerating(false)
    }
  }

  function applyChanges(cambios) {
    if (!cambios || cambios.length === 0) return
    let updated = [...nodes]
    for (const c of cambios) {
      switch (c.accion) {
        case 'agregar': {
          const newPos = c.posicion || updated.length + 1
          const newNode = {
            id: `new_${Date.now()}_${Math.random()}`,
            course_id: courseId,
            position: newPos,
            type: c.tipo || 'theory',
            title: c.titulo || 'Nuevo nodo',
            description: c.descripcion || '',
            status: 'draft',
          }
          updated.splice(newPos - 1, 0, newNode)
          break
        }
        case 'eliminar': {
          updated = updated.filter(n => n.position !== c.posicion)
          break
        }
        case 'mover': {
          const idx = updated.findIndex(n => n.position === c.posicion)
          if (idx >= 0) {
            const [item] = updated.splice(idx, 1)
            const newIdx = Math.min(Math.max((c.nueva_posicion || 1) - 1, 0), updated.length)
            updated.splice(newIdx, 0, item)
          }
          break
        }
        case 'cambiar_tipo': {
          const node = updated.find(n => n.position === c.posicion)
          if (node && NODE_TYPES.includes(c.nuevo_tipo)) node.type = c.nuevo_tipo
          break
        }
        case 'renombrar': {
          const node = updated.find(n => n.position === c.posicion)
          if (node) {
            if (c.nuevo_titulo) node.title = c.nuevo_titulo
            if (c.nueva_descripcion) node.description = c.nueva_descripcion
          }
          break
        }
      }
    }
    updated = updated.map((n, i) => ({ ...n, position: i + 1 }))
    setNodes(updated)
    setPendingChanges(null)
  }

  async function handleSendChat() {
    if (!inputText.trim() || chatLoading) return
    const userMsg = inputText.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInputText('')
    setChatLoading(true)
    setPendingChanges(null)

    try {
      const accessToken = await getAccessToken()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          courseId,
          message: userMsg,
          nodes: nodes.map(n => ({ position: n.position, type: n.type, title: n.title, description: n.description })),
          history: messages.slice(-8).map(m => ({ role: m.role, text: m.text })),
        }),
      })
      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        console.error('[chat-roadmap] error HTTP:', res.status, errBody)
        throw new Error(`Error ${res.status}: ${errBody.slice(0, 200)}`)
      }
      const data = await res.json()
      const aiMsg = data.mensaje || 'Procesando...'
      const cambios = data.cambios || []
      setMessages(prev => [...prev, { role: 'ai', text: aiMsg }])
      if (cambios.length > 0) {
        setPendingChanges(cambios)
      }
    } catch (err) {
      console.error('[chat-roadmap] error completo:', err)
      setMessages(prev => [...prev, { role: 'ai', text: `Lo siento, hubo un error. Intenta de nuevo.${err.message ? ' (' + err.message.split('. ')[0] + ')' : ''}` }])
    } finally {
      setChatLoading(false)
    }
  }

  function handleDeleteNode(nodeId) {
    if (!window.confirm('¿Eliminar este nodo?')) return
    setNodes(prev => {
      const filtered = prev.filter(n => n.id !== nodeId)
      return filtered.map((n, i) => ({ ...n, position: i + 1 }))
    })
  }

  function moveNode(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= nodes.length) return
    const updated = [...nodes]
    const temp = updated[index].position
    updated[index] = { ...updated[index], position: updated[newIndex].position }
    updated[newIndex] = { ...updated[newIndex], position: temp }
    updated.sort((a, b) => a.position - b.position)
    setNodes(updated)
  }

  const nodeSpacing = 130
  const pathWidth = 300
  const containerWidth = 700
  const nodeSize = 70
  const iconSize = 22
  const bossIconSize = 28

  function getNodePos(index) {
    const x = Math.sin(index * 1.1) * (pathWidth / 2)
    const y = index * nodeSpacing + 80
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

  if (loading) {
    return (
      <PageWrapper>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
          <LoaderCircle size={24} className="animate-spin" /> Cargando roadmap...
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="roadmap-page-wrap">
      <Header />

      <div className="rd-header" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid var(--border-light)',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate('/teacher')}><ArrowLeft size={18} /></button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Diseñador de Roadmap</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{nodes.length} nodos • Arrastra o usa el chat IA para modificar</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {success && (
            <span style={{ color: '#22C55E', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} /> {success}
            </span>
          )}
          {error && (
            <span style={{ color: '#FCA5A5', fontSize: '0.85rem' }}>{error}</span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/roadmap/${courseId}`)}>
            <Eye size={14} /> Vista estudiante
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Publicando...' : 'Publicar Roadmap'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 130px)' }}>
        {/* Left: Visual Roadmap */}
        <div className="rm-main-container" style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <div className="rm-scroll-area">
            <div className="rm-path-container" style={{ width: containerWidth, height: nodes.length * nodeSpacing + 200 }}>

              <svg className="rm-svg-path" width={containerWidth} height={nodes.length * nodeSpacing + 200} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                <path
                  d={generateSVGPath(nodes.length)}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="3 18"
                />
              </svg>

              {nodes.length === 0 && !loading ? (
                <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No hay nodos en este roadmap aún.</p>
                  <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>Usa la IA para generar el roadmap automáticamente desde los archivos subidos.</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{ gap: 8 }}
                  >
                    {generating ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {generating ? 'Generando...' : 'Generar Roadmap con IA'}
                  </button>
                </div>
              ) : (
                nodes.map((node, i) => {
                  const pos = getNodePos(i)
                  return (
                    <div
                      key={node.id}
                      className="rm-node-anchor available"
                      style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', zIndex: 20 }}
                    >
                      <div
                        className={`rm-node-v2 ${node.type} available`}
                        style={{ width: nodeSize, height: nodeSize, cursor: 'grab' }}
                      >
                        <div className="node-glow" />
                        <div className="node-main">
                          {TYPE_ICON[node.type] || <Book size={iconSize} />}
                        </div>
                        <div className="node-info-bubble" style={{ width: 180 }}>
                          <div className="node-type-tag" style={{ background: `${TYPE_COLORS[node.type] || '#6C63FF'}22`, color: TYPE_COLORS[node.type] || '#6C63FF' }}>
                            {node.type.toUpperCase()}
                          </div>
                          <div className="node-title-text">{node.title || 'Sin título'}</div>
                          {node.status === 'pending_review' && (
                            <div className="node-status-tag" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                              <Sparkles size={10} /> PENDIENTE
                            </div>
                          )}
                          {node.status === 'draft' && (
                            <div className="node-status-tag" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                              BORRADOR
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                        {i > 0 && (
                          <button className="icon-btn sm" onClick={() => moveNode(i, -1)} title="Mover arriba" style={{ width: 22, height: 22 }}>
                            ↑
                          </button>
                        )}
                        {i < nodes.length - 1 && (
                          <button className="icon-btn sm" onClick={() => moveNode(i, 1)} title="Mover abajo" style={{ width: 22, height: 22 }}>
                            ↓
                          </button>
                        )}
                        {typeof node.id === 'string' && node.id.startsWith('new_') && (
                          <button className="icon-btn sm" onClick={() => handleDeleteNode(node.id)} title="Eliminar" style={{ width: 22, height: 22, color: '#EF4444' }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div style={{
          width: 380, borderLeft: '1px solid var(--border-light)',
          display: 'flex', flexDirection: 'column', background: 'var(--surface)',
          position: 'relative',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={18} style={{ color: 'var(--primary)' }} />
              Asistente IA
            </div>
            {nodes.length === 0 && !loading && (
              <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating} style={{ gap: 4, fontSize: '0.75rem' }}>
                {generating ? <LoaderCircle size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {generating ? 'Generando...' : 'Generar'}
              </button>
            )}
          </div>

          <div className="chat-messages" style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`} style={{
                maxWidth: '90%', padding: '8px 12px', borderRadius: 12, fontSize: '0.85rem', lineHeight: 1.4,
                background: m.role === 'user' ? 'rgba(108,99,255,0.15)' : 'var(--surface-2)',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}>
                {m.text}
              </div>
            ))}
            {chatLoading && (
              <div className="chat-msg ai chat-typing" style={{ alignSelf: 'flex-start' }}>
                <LoaderCircle size={14} className="animate-spin" /> Pensando
              </div>
            )}
            {pendingChanges && !chatLoading && (
              <div style={{ alignSelf: 'center', marginTop: 8 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => applyChanges(pendingChanges)}
                  style={{ gap: 6 }}
                >
                  <Sparkles size={14} /> Aplicar cambios sugeridos
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPendingChanges(null)}
                  style={{ marginLeft: 8 }}
                >
                  Ignorar
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area" style={{ borderTop: '1px solid var(--border-light)', padding: 12, display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ej: Agrega un quiz después del nodo 3..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !chatLoading && handleSendChat()}
              disabled={chatLoading}
              style={{ flex: 1 }}
            />
            <button className="chat-send" onClick={handleSendChat} disabled={chatLoading}>
              {chatLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
