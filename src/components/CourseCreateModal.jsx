import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, FileText, BookOpen, Map, Swords, ClipboardList,
  BrainCircuit, Sparkles, AlertCircle, Check, File as FileIcon,
  GraduationCap, Type
} from 'lucide-react'

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

export default function CourseCreateModal({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState('form') // form | generating | done
  const [courseName, setCourseName] = useState('')
  const [courseSubject, setCourseSubject] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
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
  const fileInputRef = useRef(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setCourseName('')
      setCourseSubject('')
      setCourseDesc('')
      setFiles([])
      setAutoGen({ temas: true, contenidos: true, roadmap: true, coliseo: false, examenes: true, ejercicios: false })
      setError('')
    }
  }, [isOpen])

  const handleFileDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || [])
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles].slice(0, 10)) // max 10 files
    }
    if (e.target) e.target.value = ''
  }, [])

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const toggleAutoGen = (id) => {
    setAutoGen(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCreate = () => {
    // Validate
    if (!courseName.trim()) {
      setError('El nombre del curso es obligatorio.')
      return
    }
    setError('')

    // Simulate course creation with a short delay
    setStep('generating')
    setTimeout(() => {
      setStep('done')
    }, 2000)
  }

  const handleFinish = () => {
    const newCourse = {
      id: Date.now(),
      name: courseName,
      subject: courseSubject || courseName,
      description: courseDesc,
      students: 0,
      nodes: 0,
      progress: 0,
      status: 'Borrador',
      files: files.length,
      autoGen: Object.entries(autoGen).filter(([, v]) => v).map(([k]) => k),
      createdAt: new Date().toISOString(),
    }
    onCreated?.(newCourse)
    onClose()
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
                {step === 'generating' && 'Generando curso...'}
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
                          <select className="input-field" defaultValue="">
                            <option value="" disabled>Seleccionar nivel</option>
                            <option value="principiante">Principiante</option>
                            <option value="intermedio">Intermedio</option>
                            <option value="avanzado">Avanzado</option>
                          </select>
                        </div>
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

                  {/* File upload (future RAG) */}
                  <div>
                    <div className="form-section-title">
                      <Upload size={14} />
                      Archivos de referencia
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
                        Sube materiales de referencia (PDF, DOC, PPT, TXT) para que la IA genere
                        el contenido del curso automaticamente. Soporte RAG proximamente.
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
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Analizando archivos y generando {Object.values(autoGen).filter(Boolean).length} componentes...
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(autoGen).filter(([, v]) => v).map(([key]) => {
                      const opt = AUTO_GEN_OPTIONS.find(o => o.id === key)
                      return (
                        <motion.div
                          key={key}
                          className="badge"
                          style={{ background: `${opt.color}18`, color: opt.color }}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() }}
                        >
                          {opt.label}
                        </motion.div>
                      )
                    })}
                  </div>
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
                      Se ha generado el curso &quot;{courseName}&quot; con los componentes seleccionados.
                    </div>
                  </div>
                  <div className="card" style={{ padding: 16, width: '100%', maxWidth: 400, marginTop: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(autoGen).filter(([, v]) => v).map(([key]) => {
                        const opt = AUTO_GEN_OPTIONS.find(o => o.id === key)
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                            <Check size={14} style={{ color: '#4ADE80', flexShrink: 0 }} />
                            <span>{opt.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {files.length > 0 && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      {files.length} archivo(s) de referencia almacenados para RAG
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
                <button className="btn btn-primary btn-lg" onClick={handleFinish}>
                  <GraduationCap size={16} />
                  Ir al curso
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
