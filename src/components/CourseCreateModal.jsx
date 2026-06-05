import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, FileText, BookOpen, Map, Swords, ClipboardList,
  BrainCircuit, Sparkles, AlertCircle, Check, Copy, File as FileIcon,
  GraduationCap, Type, Hash, LoaderCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createCourse, uploadSourceFile, approveAllNodes } from '../lib/api'
import { generateRoadmapDirect } from '../lib/gemini'
import { triggerEmbedSource } from '../lib/llm'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const AUTO_GEN_OPTIONS = [
  {
    id: 'temas',
    label: 'Temas y lecciones',
    desc: 'Estructura de temas y subtemas del curso',
    icon: <BookOpen size={18} />,
    color: '#6C63FF',
  },
  {
    id: 'contenidos',
    label: 'Contenido educativo',
    desc: 'Material de estudio para cada leccion',
    icon: <FileText size={18} />,
    color: '#22C55E',
  },
  {
    id: 'roadmap',
    label: 'Roadmap visual',
    desc: 'Mapa de aprendizaje con nodos y progresion',
    icon: <Map size={18} />,
    color: '#F59E0B',
  },
  {
    id: 'coliseo',
    label: 'Coliseo / Retos',
    desc: 'Desafios y batallas de conocimiento',
    icon: <Swords size={18} />,
    color: '#EF4444',
  },
  {
    id: 'examenes',
    label: 'Examenes y quizzes',
    desc: 'Evaluaciones por leccion y finales',
    icon: <ClipboardList size={18} />,
    color: '#8B5CF6',
  },
  {
    id: 'ejercicios',
    label: 'Ejercicios practicos',
    desc: 'Actividades interactivas y ejercicios',
    icon: <BrainCircuit size={18} />,
    color: '#3B82F6',
  },
]

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function randomInviteCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '0123456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)]
  for (let i = 0; i < 4; i++) s += digits[Math.floor(Math.random() * digits.length)]
  return s
}

export default function CourseCreateModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('form') // form | uploading | generating | done
  const [courseName, setCourseName] = useState('')
  const [courseSubject, setCourseSubject] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseLevel, setCourseLevel] = useState('')
  const [courseRigor, setCourseRigor] = useState(3)
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [autoGen, setAutoGen] = useState({
    temas: true,
    contenidos: true,
    roadmap: true,
    coliseo: false,
    examenes: true,
    ejercicios: false,
  })
  const [error, setError] = useState('')
  const [progressMsg, setProgressMsg] = useState('')
  const [createdCourse, setCreatedCourse] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [generatedCount, setGeneratedCount] = useState(0)
  const fileInputRef = useRef(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setCourseName('')
      setCourseSubject('')
      setCourseDesc('')
      setCourseLevel('')
      setCourseRigor(3)
      setFiles([])
      setAutoGen({ temas: true, contenidos: true, roadmap: true, coliseo: false, examenes: true, ejercicios: false })
      setError('')
      setProgressMsg('')
      setCreatedCourse(null)
      setGeneratedCount(0)
    }
  }, [isOpen])

  const handleFileDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || [])
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles].slice(0, 10))
    }
    if (e.target) e.target.value = ''
  }, [])

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const toggleAutoGen = (id) => {
    setAutoGen(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleCreate() {
    if (!courseName.trim()) {
      setError('El nombre del curso es obligatorio.')
      return
    }
    setError('')
    setStep('generating')

    if (!isSupabaseConfigured || !user?.id) {
      setError('Supabase no está configurado. No se puede crear el curso.')
      setStep('form')
      return
    }

    try {
      // Step 1: Create course in Supabase
      setProgressMsg('Creando curso...')
      const inviteCode = randomInviteCode()
      const { data: course, error: cErr } = await createCourse({
        teacher_id: user.id,
        title: courseName.trim(),
        description: courseDesc.trim() || null,
        category: courseSubject.trim() || null,
        level: courseLevel || null,
        status: 'draft',
        rigor: courseRigor,
        invite_code: inviteCode,
      })
      if (cErr) throw cErr
      setCreatedCourse(course)

      // Step 2: Upload files in background (non-blocking, fire-and-forget for storage + RAG)
      if (files.length > 0) {
        setProgressMsg(`Subiendo ${files.length} archivo(s)...`)
        const uploadPromises = files.map(async (f) => {
          const { data: source, error: uErr } = await uploadSourceFile({ courseId: course.id, file: f })
          if (uErr) {
            console.warn('upload error:', uErr)
            return null
          }
          // Trigger RAG embedding for this file
          if (source?.id) {
            triggerEmbedSource(source.id).catch((e) => console.warn('embed-source error:', e))
          }
          return source
        })
        Promise.all(uploadPromises).catch(() => {})
      }

      // Step 3: Generate roadmap DIRECTLY with Gemini (no Supabase Edge Function)
      if (autoGen.roadmap) {
        setProgressMsg('Generando roadmap con IA... Esto puede tomar unos segundos.')
        try {
          const result = await generateRoadmapDirect({
            title: courseName.trim(),
            description: courseDesc.trim(),
            category: courseSubject.trim(),
            level: courseLevel,
            rigor: courseRigor,
            files: files.map(f => f.name),
          })

          setProgressMsg(`Roadmap generado: ${result.count} nodos con contenido completo. Guardando...`)

          // Step 4: Save to Supabase + publish
          const { error: saveErr } = await approveAllNodes(course.id, result.nodes)
          if (saveErr) {
            console.error('Error saving roadmap:', saveErr)
            setProgressMsg('Roadmap generado pero hubo un error al guardar. Intenta desde el dashboard.')
          } else {
            setGeneratedCount(result.count)
            setProgressMsg('¡Listo! Curso publicado con roadmap completo.')
          }
        } catch (aiErr) {
          console.error('AI generation error:', aiErr)
          // Still mark as done - course exists, just without roadmap
          setProgressMsg(`Curso creado. Error al generar roadmap: ${aiErr.message}`)
          // Publish the course anyway so teacher can still see it
          await supabase?.from('courses').update({ status: 'published' }).eq('id', course.id)
        }
      } else {
        // No roadmap requested - publish course as-is
        await supabase?.from('courses').update({ status: 'published' }).eq('id', course.id)
        setProgressMsg('Curso creado y publicado.')
      }

      setStep('done')
    } catch (err) {
      console.error('Course creation error:', err)
      setError(err.message || 'No se pudo crear el curso.')
      setStep('form')
    }
  }

  function handleFinish() {
    if (createdCourse) {
      onCreated?.({
        id: createdCourse.id,
        name: createdCourse.title,
        subject: createdCourse.category,
        description: createdCourse.description,
        students: 0,
        nodes: generatedCount,
        progress: 0,
        status: 'Activo',
        files: files.length,
        inviteCode: createdCourse.invite_code || '',
        createdAt: createdCourse.created_at,
      })
    }
    onClose()
  }

  function handleGoToRoadmap() {
    if (createdCourse) {
      onCreated?.({
        id: createdCourse.id,
        name: createdCourse.title,
        subject: createdCourse.category,
        description: createdCourse.description,
        students: 0,
        nodes: generatedCount,
        progress: 0,
        status: 'Activo',
        files: files.length,
        inviteCode: createdCourse.invite_code || '',
        createdAt: createdCourse.created_at,
      })
      onClose()
      navigate(`/roadmap/${createdCourse.id}`)
    }
  }

  const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(ext)) return <FileText size={16} />
    if (['doc', 'docx'].includes(ext)) return <FileText size={16} />
    if (['ppt', 'pptx'].includes(ext)) return <FileText size={16} />
    if (['xls', 'xlsx'].includes(ext)) return <FileText size={16} />
    if (['txt'].includes(ext)) return <Type size={16} />
    return <FileIcon size={16} />
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className="modal-container"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h2>
                {step === 'form' && 'Crear nuevo curso'}
                {step === 'generating' && 'Creando curso...'}
                {step === 'done' && 'Curso creado'}
              </h2>
              <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {step === 'form' && (
                <>
                  {/* Basic info */}
                  <div>
                    <div className="form-section-title">
                      <GraduationCap size={14} />
                      Informacion basica
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className="input-group">
                        <label>Nombre del curso *</label>
                        <input
                          className="input-field"
                          placeholder="Ej: Biologia Celular Avanzada"
                          value={courseName}
                          onChange={e => { setCourseName(e.target.value); setError('') }}
                        />
                      </div>
                      <div className="form-row">
                        <div className="input-group">
                          <label>Materia / Area</label>
                          <input
                            className="input-field"
                            placeholder="Ej: Biologia"
                            value={courseSubject}
                            onChange={e => setCourseSubject(e.target.value)}
                          />
                        </div>
                        <div className="input-group">
                          <label>Nivel</label>
                          <select
                            className="input-field"
                            value={courseLevel}
                            onChange={e => setCourseLevel(e.target.value)}
                          >
                            <option value="">Seleccionar nivel</option>

                            <option value="7-10">7-10 años</option>
                            <option value="11-14">11-14 años</option>
                            <option value="15-17">15-17 años</option>
                            <option value="18+">18+ años</option>
                          </select>
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Rigor académico (1=informal, 5=estricto)</label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={courseRigor}
                          onChange={e => setCourseRigor(Number(e.target.value))}
                          className="input-field"
                        />
                        <small style={{ color: 'var(--text-muted)' }}>Nivel actual: {courseRigor}</small>
                      </div>
                      <div className="input-group">
                        <label>Descripcion</label>
                        <textarea
                          className="input-field form-textarea"
                          placeholder="Describe de que trata el curso, objetivos, y contenido general..."
                          value={courseDesc}
                          onChange={e => setCourseDesc(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* File upload */}
                  <div>
                    <div className="form-section-title">
                      <Upload size={14} />
                      Archivos de referencia (opcional)
                    </div>
                    <div
                      className={`upload-zone ${dragging ? 'dragging' : ''}`}
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleFileDrop}
                    >
                      <div className="upload-zone-icon">
                        <Upload size={24} />
                      </div>
                      <div className="upload-zone-title">
                        {dragging ? 'Suelta los archivos aqui' : 'Arrastra archivos o haz clic'}
                      </div>
                      <div className="upload-zone-sub">
                        Sube materiales de referencia (PDF, DOC, TXT) para mejorar la generacion.
                        La IA tambien funciona sin archivos, usando nombre y descripcion del curso.
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv"
                        onChange={handleFileDrop}
                      />
                    </div>

                    {files.length > 0 && (
                      <div className="file-list">
                        {files.map((file, i) => (
                          <div key={`${file.name}-${i}`} className="file-item">
                            <div className="file-item-icon">{getFileIcon(file.name)}</div>
                            <div className="file-item-info">
                              <div className="file-item-name">{file.name}</div>
                              <div className="file-item-size">{formatFileSize(file.size)}</div>
                            </div>
                            <button className="file-item-remove" onClick={() => removeFile(i)}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Auto-generation */}
                  <div>
                    <div className="form-section-title">
                      <Sparkles size={14} />
                      Generacion automatica
                    </div>
                    <div className="auto-gen-grid">
                      {AUTO_GEN_OPTIONS.map(opt => (
                        <div
                          key={opt.id}
                          className={`auto-gen-item ${autoGen[opt.id] ? 'active' : ''}`}
                          onClick={() => toggleAutoGen(opt.id)}
                          style={{
                            borderColor: autoGen[opt.id] ? opt.color + '55' : undefined,
                            background: autoGen[opt.id] ? `${opt.color}08` : undefined,
                          }}
                        >
                          <div className="auto-gen-icon" style={{ background: `${opt.color}18`, color: opt.color }}>
                            {opt.icon}
                          </div>
                          <div className="auto-gen-info">
                            <div className="auto-gen-label">{opt.label}</div>
                            <div className="auto-gen-desc">{opt.desc}</div>
                          </div>
                          <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={autoGen[opt.id]}
                              onChange={() => toggleAutoGen(opt.id)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 'var(--radius)',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        fontSize: '0.85rem', color: '#FCA5A5',
                      }}
                    >
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      {error}
                    </motion.div>
                  )}
                </>
              )}

              {step === 'generating' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 0' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      border: '3px solid var(--border-light)',
                      borderTopColor: 'var(--primary)',
                    }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Creando curso con IA</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 380 }}>
                      {progressMsg || 'Preparando...'}
                    </div>
                  </div>
                  {progressMsg.includes('Roadmap') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary-light)', fontSize: '0.8rem' }}>
                      <LoaderCircle size={14} className="animate-spin" />
                      La IA esta generando el contenido completo de cada leccion...
                    </div>
                  )}
                </div>
              )}

              {step === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'rgba(34,197,94,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#4ADE80',
                    }}
                  >
                    <Check size={32} />
                  </motion.div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Curso creado exitosamente</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      {generatedCount > 0
                        ? `Se generaron ${generatedCount} nodos con contenido completo para "${courseName}".`
                        : `El curso "${courseName}" ha sido creado.`}
                    </div>
                  </div>

                  {/* Invite code */}
                  {createdCourse?.invite_code && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(34,197,94,0.08))',
                      border: '1px solid rgba(108,99,255,0.25)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 16,
                      width: '100%',
                      maxWidth: 400,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                        <Hash size={12} /> Código de invitación
                      </div>
                      <div style={{
                        fontFamily: 'SF Mono, Fira Code, monospace',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        letterSpacing: '0.15em',
                        color: 'var(--primary-light)',
                      }}>
                        {createdCourse.invite_code}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(createdCourse.invite_code)
                          setCopiedCode(true)
                          setTimeout(() => setCopiedCode(false), 2000)
                        }}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text)',
                          padding: '8px 14px',
                          borderRadius: 999,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {copiedCode ? <><Check size={14} style={{ color: '#22C55E' }}/> Copiado</> : <><Copy size={14} /> Copiar código</>}
                      </button>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                        Comparte este código para que los estudiantes se unan desde Explorar
                      </div>
                    </div>
                  )}

                  {progressMsg && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textAlign: 'center', maxWidth: 400 }}>
                      {progressMsg}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {step === 'form' && (
                <>
                  <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                  <button className="btn btn-primary btn-lg" onClick={handleCreate}>
                    Crear curso
                  </button>
                </>
              )}
              {step === 'generating' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="btn btn-ghost" style={{ opacity: 0.5 }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      style={{ width: 16, height: 16, border: '2px solid var(--border-light)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}
                    />
                    Generando...
                  </div>
                </div>
              )}
              {step === 'done' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={handleFinish}>
                    <GraduationCap size={16} />
                    Ir al dashboard
                  </button>
                  {createdCourse && generatedCount > 0 && (
                    <button className="btn btn-primary btn-lg" onClick={handleGoToRoadmap}>
                      <Map size={16} />
                      Ver Roadmap
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
