/**
 * Voice command categories and action mapping.
 * Maps every possible student interaction to a voice-triggerable action.
 */
export const CATEGORIES = {
  NAVIGATE: 'navigate',
  QUIZ_ANSWER: 'quiz_answer',
  LESSON_ACTION: 'lesson_action',
  RESULT_ACTION: 'result_action',
  REVIEW_ACTION: 'review_action',
  COLISEO_ACTION: 'coliseo_action',
  SYSTEM_ACTION: 'system_action',
  QUESTION: 'question',
  UNKNOWN: 'unknown',
}

/**
 * Action registry: each action maps to a handler function signature.
 * The VoiceContext resolves these and calls the appropriate handler.
 */
export const ACTIONS = {
  // Navigation
  goToDashboard: { page: 'dashboard', navigate: '/dashboard' },
  goToAchievements: { page: 'achievements', navigate: '/achievements' },
  goToExplore: { page: 'explore', navigate: '/explore' },
  goToProfile: { page: 'profile', navigate: '/profile' },
  goToSettings: { page: 'settings', navigate: '/settings' },
  goToColiseo: { page: 'coliseo', navigate: '/coliseo' },
  goBack: { page: 'any', action: 'goBack' },

  // Quiz / Coliseo answers
  selectOptionA: { page: 'quiz', action: 'selectOption', param: 0 },
  selectOptionB: { page: 'quiz', action: 'selectOption', param: 1 },
  selectOptionC: { page: 'quiz', action: 'selectOption', param: 2 },
  selectOptionD: { page: 'quiz', action: 'selectOption', param: 3 },

  // Lesson actions
  finishNode: { page: 'lesson', action: 'finishNode' },
  nextBlock: { page: 'lesson', action: 'nextBlock' },
  prevBlock: { page: 'lesson', action: 'prevBlock' },
  openChat: { page: 'lesson', action: 'openChat' },
  closeChat: { page: 'lesson', action: 'closeChat' },

  // Quiz result actions
  nextNode: { page: 'quizResult', action: 'nextNode' },
  reviewErrors: { page: 'quizResult', action: 'reviewErrors' },
  retryQuiz: { page: 'quizResult', action: 'retryQuiz' },

  // Review actions
  understood: { page: 'review', action: 'understood' },
  dontUnderstand: { page: 'review', action: 'dontUnderstand' },
  nextError: { page: 'review', action: 'nextError' },

  // Coliseo actions
  enterArena: { page: 'coliseo', action: 'enterArena' },
  exitColiseo: { page: 'coliseo', action: 'exitColiseo' },

  // System
  readScreen: { page: 'any', action: 'readScreen' },
  repeat: { page: 'any', action: 'repeat' },
  help: { page: 'any', action: 'help' },

  // Question
  answerQuestion: { page: 'any', action: 'answerQuestion' },
}

/**
 * Voice command examples for each action (used for help prompts)
 */
export const COMMAND_EXAMPLES = {
  goToDashboard: ['ir al inicio', 'dashboard', 'pantalla principal'],
  goToAchievements: ['ver logros', 'mis medallas', 'logros'],
  goToExplore: ['explorar cursos', 'buscar cursos', 'catálogo'],
  goToProfile: ['mi perfil', 'ver perfil'],
  goToSettings: ['configuración', 'ajustes'],
  goToColiseo: ['coliseo', 'arena de retos', 'entrar al coliseo'],
  goBack: ['volver', 'atrás', 'regresar'],
  selectOptionA: ['opción A', 'respuesta A', 'letra A', 'primera'],
  selectOptionB: ['opción B', 'respuesta B', 'letra B', 'segunda'],
  selectOptionC: ['opción C', 'respuesta C', 'letra C', 'tercera'],
  selectOptionD: ['opción D', 'respuesta D', 'letra D', 'cuarta'],
  finishNode: ['terminar nodo', 'completar lección', 'finalizar'],
  nextBlock: ['siguiente bloque', 'bajar'],
  prevBlock: ['bloque anterior', 'subir'],
  openChat: ['abrir chat', 'hablar con tutor', 'asistente'],
  closeChat: ['cerrar chat'],
  nextNode: ['siguiente nodo', 'continuar', 'siguiente lección'],
  reviewErrors: ['revisar errores', 'ver errores', 'corregir'],
  retryQuiz: ['intentar de nuevo', 'repetir quiz', 'reintentar'],
  understood: ['entendido', 'ya entendí', 'siguiente'],
  dontUnderstand: ['no entiendo', 'explicar mejor', 'ayuda'],
  enterArena: ['entrar a la arena', 'empezar coliseo', 'comenzar'],
  exitColiseo: ['salir del coliseo', 'abandonar'],
  readScreen: ['leer pantalla', 'qué hay en pantalla', 'describir'],
  repeat: ['repetir', 'otra vez', 'de nuevo'],
  help: ['ayuda', 'qué puedo hacer', 'comandos'],
}

/**
 * Get help text for current page context
 */
export function getHelpText(page) {
  const pageCommands = {
    dashboard: ['qué cursos tengo', 'abrir curso [nombre]', 'último nodo de [curso]', 'ver logros', 'leer notificaciones', 'dónde estoy', 'leer pantalla', 'configuración', 'ayuda'],
    roadmap: ['cuántos nodos tengo', 'último nodo disponible', 'ir al nodo [número]', 'volver', 'dónde estoy', 'leer pantalla', 'ayuda'],
    lesson: ['leer la lección', 'terminar nodo', 'siguiente lección', 'abrir chat', 'cuántos nodos tengo', 'dónde estoy', 'volver', 'ayuda'],
    quiz: ['leer la pregunta', 'alternativas', 'opción A', 'opción B', 'opción C', 'opción D', 'marco la [letra]', 'volver', 'ayuda'],
    quizResult: ['siguiente nodo', 'revisar errores', 'intentar de nuevo', 'cuántos nodos tengo', 'volver', 'ayuda'],
    review: ['entendido', 'no entiendo', 'leer pantalla', 'volver', 'ayuda'],
    coliseo: ['entrar a la arena', 'opción A', 'opción B', 'opción C', 'opción D', 'salir', 'ayuda'],
    achievements: ['qué logros tengo', 'volver al inicio', 'ayuda'],
    explore: ['buscar curso [nombre]', 'qué cursos tengo', 'volver', 'ayuda'],
    profile: ['leer pantalla', 'volver', 'ayuda'],
    settings: ['volver', 'leer pantalla', 'ayuda'],
  }
  const cmds = pageCommands[page] || ['volver', 'ayuda', 'leer pantalla', 'dónde estoy']
  return `Estás en ${page}. Puedes decir: ${cmds.join(', ')}.`
}
