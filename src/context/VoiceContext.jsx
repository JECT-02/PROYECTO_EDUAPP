import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startContinuousListening, stopContinuousListening, transcribe, categorize, speak, stopSpeaking, setLastSpoken, getLastSpoken, askVoiceQuestion, isVoiceSupported } from '../lib/voice'
import { getHelpText } from '../lib/voice-commands'
import { useAuth } from './AuthContext'
import { listNotifications, listStudentMedals, getCourseNodes, getStudentEnrollments, getProgressForEnrollment } from '../lib/api'

const VoiceContext = createContext(null)

export function useVoice() {
  return useContext(VoiceContext)
}

export function VoiceProvider({ children }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return !!JSON.parse(localStorage.getItem('eduapp_prefs') || '{}').voice } catch { return false }
  })
  const [listening, setListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle') // idle | active | processing
  const enabledRef = useRef(voiceEnabled)
  const pageContext = useRef({})
  const actionHandlers = useRef({})

  useEffect(() => { enabledRef.current = voiceEnabled }, [voiceEnabled])
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('eduapp_prefs') || '{}')
      p.voice = voiceEnabled
      localStorage.setItem('eduapp_prefs', JSON.stringify(p))
    } catch {}
  }, [voiceEnabled])

  useEffect(() => {
    if (user?.fullProfile?.accessibility_settings?.voice) setVoiceEnabled(true)
  }, [user?.fullProfile?.accessibility_settings?.voice])

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(v => !v)
    stopSpeaking()
    setListening(false)
    setStatus('idle')
  }, [])

  const setPageContext = useCallback((ctx) => {
    pageContext.current = { ...pageContext.current, ...ctx }
  }, [])

  const registerHandler = useCallback((action, handler) => {
    actionHandlers.current[action] = handler
    return () => { delete actionHandlers.current[action] }
  }, [])

  // Start/stop continuous listening when voice enabled changes
  useEffect(() => {
    if (!voiceEnabled || !isVoiceSupported()) return

    speak('Voz activada. Di un comando.')
    setStatus('idle')

    startContinuousListening({
      onSpeechStart: () => {
        setListening(true)
        setStatus('active')
        setFeedback('')
        setError('')
        setTranscript('')
      },
      onSpeechEnd: async (audioBlob) => {
        setListening(false)
        if (!audioBlob || audioBlob.size < 100) {
          setStatus('idle')
          return // too short, probably noise
        }
        setStatus('processing')
        setFeedback('Procesando...')
        try {
          const text = await transcribe(audioBlob)
          if (!text || text.trim().length < 2) {
            setStatus('idle')
            setFeedback('')
            return
          }
          setTranscript(text)
          setLastSpoken(text)

          const ctx = {
            page: pageContext.current.page || 'desconocida',
            courseTitle: pageContext.current.courseTitle,
            nodeTitle: pageContext.current.nodeTitle,
            courses: pageContext.current.courses || [],
            options: pageContext.current.options || [],
          }
          const result = await categorize(text, ctx)
          
          if (result.responseText) {
            setFeedback(result.responseText)
            speak(result.responseText)
          }
          await executeVoiceAction(result, text)
          setStatus('idle')
        } catch (err) {
          console.warn('[voice] error:', err.message)
          setError(err.message)
          setStatus('idle')
          speak('Error al procesar. Intenta de nuevo.')
        }
      },
      onLevel: (level) => {
        setAudioLevel(level)
      },
    }).catch(() => {})

    return () => {
      stopContinuousListening()
      setListening(false)
      setStatus('idle')
    }
  }, [voiceEnabled])

  async function executeVoiceAction(result, originalText) {
    const { category, action, params } = result

    // Page-specific registered handlers
    if (action && actionHandlers.current[action]) {
      actionHandlers.current[action](params)
      return
    }

    // === NAVIGATE ===
    if (category === 'navigate') {
      const navMap = {
        goToDashboard: '/dashboard', goToAchievements: '/achievements',
        goToExplore: '/explore', goToProfile: '/profile',
        goToSettings: '/settings', goToColiseo: '/coliseo',
      }
      if (navMap[action]) { navigate(navMap[action]); return }
      if (action === 'goBack') { navigate(-1); return }

      // goToCourseRoadmap: find course by name and navigate
      if (action === 'goToCourseRoadmap' || action === 'goToRoadmap' || action === 'searchCourse') {
        const match = findCourse(params?.courseName || originalText)
        if (match) { navigate(`/roadmap/${match.id}`); return }
        speak(`No encontré "${params?.courseName || 'ese'}" curso. Di "qué cursos tengo" para escuchar la lista.`)
        return
      }

      // goToLastNode / goToLastAvailableNode: find last incomplete node and open it
      if (action === 'goToLastNode' || action === 'goToLastAvailableNode') {
        goToLastAvailableNode(params?.courseName || originalText)
        return
      }

      // goToNextNode: current course + 1 position
      if (action === 'goToNextNode') {
        const ctx = pageContext.current
        if (ctx.page === 'roadmap' || ctx.page === 'lesson' || ctx.page === 'quiz') {
          if (actionHandlers.current.finishNode) { actionHandlers.current.finishNode() }
          else goToLastAvailableNode()
          return
        }
        speak('No estás en un curso ahora. Di "qué cursos tengo" para ver tus cursos.')
        return
      }
      return
    }

    // === QUIZ ANSWER ===
    if (category === 'quiz_answer') {
      if (actionHandlers.current.selectOption) {
        const idx = { selectOptionA: 0, selectOptionB: 1, selectOptionC: 2, selectOptionD: 3 }[action]
        if (idx !== undefined) actionHandlers.current.selectOption({ index: idx })
        else speak('Opción no reconocida. Di A, B, C o D.')
      }
      return
    }

    // === SYSTEM ===
    if (category === 'system_action') {
      if (action === 'readScreen' || action === 'readContent') {
        const main = document.querySelector('main')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 800)
        speak(main || 'No hay contenido visible en esta pantalla.')
      } else if (action === 'repeat') {
        const last = getLastSpoken()
        speak(last || 'No hay nada que repetir.')
      } else if (action === 'help') {
        speak(getHelpText(pageContext.current.page || 'desconocida'))
      } else if (action === 'whereAmI') {
        const ctx = pageContext.current
        let info = `Estás en ${ctx.page || 'una página'}`
        if (ctx.courseTitle) info += `. Curso: ${ctx.courseTitle}`
        if (ctx.nodeTitle) info += `. Lección: ${ctx.nodeTitle}`
        if (ctx.nodePosition != null) info += `. Nodo ${ctx.nodePosition} de ${ctx.totalNodes || '?'}`
        speak(info)
      } else if (action === 'listCourses') {
        const courses = pageContext.current.courses || []
        if (courses.length) speak(`Tus cursos: ${courses.join(', ')}.`)
        else speak('No tienes cursos. Ve a explorar para inscribirte.')
      } else if (action === 'readNotifications') {
        readNotificationsAloud()
      } else if (action === 'listAchievements') {
        listAchievementsAloud()
      } else if (action === 'nodeCount') {
        nodeCountAloud()
      } else if (action === 'nodeProgress') {
        const ctx = pageContext.current
        speak(`Nodo ${ctx.nodePosition || '?'} de ${ctx.totalNodes || '?'} en ${ctx.courseTitle || 'este curso'}`)
      }
      return
    }

    // === QUIZ_ACTION (read question/options) ===
    if (category === 'quiz_action') {
      if (action === 'readQuestion') {
        readQuizQuestion()
      } else if (action === 'readOptions') {
        readQuizOptions()
      } else if (action === 'markAnswer') {
        markQuizAnswer(params)
      }
      return
    }

    // === QUESTION / UNKNOWN ===
    if (category === 'question' || category === 'unknown') {
      try {
        const ctxText = pageContext.current.courseTitle
          ? `Curso: ${pageContext.current.courseTitle}. Nodo: ${pageContext.current.nodeTitle || 'desconocido'}`
          : ''
        const answer = await askVoiceQuestion(originalText, ctxText)
        speak(answer || 'No tengo respuesta. Pregunta sobre el contenido del curso.')
      } catch { speak('Error al consultar. Intenta otra vez.') }
    }
  }

  function findCourse(query) {
    const q = (query || '').toLowerCase()
    const courses = pageContext.current.courses || []
    const ids = pageContext.current.courseIds || []
    const match = courses.find(c => c.toLowerCase().includes(q))
    if (match) {
      const idx = courses.indexOf(match)
      return { name: match, id: ids[idx] }
    }
    return null
  }

  async function readNotificationsAloud() {
    try {
      const { data } = await listNotifications(user?.id)
      const notifs = data || []
      if (!notifs.length) { speak('No tienes notificaciones nuevas.'); return }
      const unread = notifs.filter(n => !n.read)
      speak(`Tienes ${notifs.length} notificaciones, ${unread.length} sin leer. ${notifs.slice(0, 3).map(n => (n.payload?.title || n.payload?.message || 'Notificación')).join('. ')}`)
    } catch { speak('No pude leer las notificaciones.') }
  }

  async function listAchievementsAloud() {
    try {
      const { data } = await listStudentMedals(user?.id)
      const medals = data || []
      if (!medals.length) { speak('No tienes logros todavía. Completa quizzes para ganarlos.'); return }
      const names = medals.map(m => m.name || m.achievement || 'Logro').slice(0, 5)
      speak(`Tienes ${medals.length} logros. ${names.join(', ')}. Di "ver logros" para ir a la pantalla.`)
    } catch { speak('No pude leer los logros.') }
  }

  function nodeCountAloud() {
    const ctx = pageContext.current
    if (!ctx.courseTitle) { speak('No estás en un curso ahora. Di "qué cursos tengo".'); return }
    const completed = ctx.completedNodes || 0
    const total = ctx.totalNodes || 0
    if (total > 0) {
      speak(`${ctx.courseTitle}: ${completed} de ${total} nodos completados.`)
    } else {
      speak(`El curso ${ctx.courseTitle} aún no tiene nodos.`)
    }
  }

  async function goToLastAvailableNode(query) {
    const match = query ? findCourse(query) : null
    const ctx = pageContext.current
    const courseId = match?.id || ctx.courseIds?.[0] || ctx.currentCourseId
    if (!courseId) { speak('No encontré un curso. Di "qué cursos tengo".'); return }
    try {
      const [{ data: nodes }, { data: enrollments }] = await Promise.all([
        getCourseNodes(courseId),
        getStudentEnrollments(user?.id),
      ])
      if (!nodes?.length) { speak('Este curso no tiene nodos todavía.'); return }
      const enrollment = (enrollments || []).find(e => e.course_id === courseId)
      const progData = enrollment ? (await getProgressForEnrollment(enrollment.id)).data || [] : []
      const completedSet = new Set(progData.filter(p => p.state === 'completed').map(p => p.node_id))
      // Find first node NOT completed (or last node if all completed)
      let target = nodes[0]
      for (const n of nodes) {
        if (!completedSet.has(n.id)) { target = n; break }
        target = n
      }
      const path = (target.type === 'quiz' || target.type === 'boss') ? '/quiz' : '/lesson'
      navigate(`${path}/${courseId}/${target.position}`)
      speak(`Abriendo nodo ${target.position}: ${target.title}`)
    } catch { speak('No pude abrir el último nodo disponible.') }
  }

  function readQuizQuestion() {
    const ctx = pageContext.current
    if (ctx.page !== 'quiz') { speak('No estás en un quiz.'); return }
    const questionText = ctx.nodeTitle || 'Pregunta actual'
    const options = ctx.options || []
    speak(`${questionText}. Opciones: ${options.map((o, i) => `${String.fromCharCode(65 + i)}: ${o}`).join('. ')}`)
  }

  function readQuizOptions() {
    const options = pageContext.current.options || []
    if (!options.length) { speak('No hay opciones disponibles.'); return }
    speak(`Opciones: ${options.map((o, i) => `${String.fromCharCode(65 + i)}: ${o}`).join('. ')}`)
  }

  function markQuizAnswer(params) {
    const idx = { A: 0, B: 1, C: 2, D: 3, '1': 0, '2': 1, '3': 2, '4': 3, primera: 0, segunda: 1, tercera: 2, cuarta: 3 }
    const answerKey = params?.answer || params?.option || ''
    const i = idx[answerKey.toLowerCase()]
    if (i !== undefined && actionHandlers.current.selectOption) {
      const options = pageContext.current.options || []
      actionHandlers.current.selectOption({ index: i })
      speak(`Seleccionada opción ${String.fromCharCode(65 + i)}: ${options[i] || ''}`)
    } else {
      speak('No entendí qué opción marcar. Di A, B, C o D.')
    }
  }

  return (
    <VoiceContext.Provider value={{
      voiceEnabled,
      toggleVoice,
      listening,
      audioLevel,
      status,
      transcript,
      feedback,
      error,
      setPageContext,
      registerHandler,
      isVoiceSupported,
    }}>
      {children}
    </VoiceContext.Provider>
  )
}
