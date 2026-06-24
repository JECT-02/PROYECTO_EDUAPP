/**
 * Nivel de Entendimiento
 * S = (P * 0.50) + (Nc * 0.25) + (Er * 0.15) + (Te * 0.10)
 *
 * P  = promedio de scores en quizzes/boss (0-1). Si no hay quizzes, usa Nc.
 * Nc = nodos completados / total nodos (0-1)
 * Er = 1 - (errores / (errores + aciertos)), penaliza errores. Si sin datos, 1.
 * Te = min(tiempo estudio en horas / 2, 1), esfuerzo
 */
export function calculateUnderstanding({ completedNodes, totalNodes, avgScore, totalCorrect, totalWrong, studyTimeMin }) {
  const Nc = totalNodes > 0 ? completedNodes / totalNodes : 0
  
  // Quiz performance: 50% weight — dominant factor
  const hasQuizData = avgScore != null && totalNodes > 0
  const P = hasQuizData ? Math.min(avgScore / 100, 1) : Nc
  
  // Error ratio: 15% weight — penalizes mistakes
  const totalAnswered = (totalCorrect || 0) + (totalWrong || 0)
  const Er = totalAnswered > 0 ? totalCorrect / totalAnswered : 1
  
  // Study effort: 10% weight
  const Te = Math.min((studyTimeMin || 0) / 120, 1)
  
  const value = (P * 0.50) + (Nc * 0.25) + (Er * 0.15) + (Te * 0.10)
  
  return {
    value: Math.round(value * 100),
    Nc: Math.round(Nc * 100),
    P: Math.round(P * 100),
    Er: Math.round(Er * 100),
    Te: Math.round(Te * 100),
  }
}

export function understandingColor(value) {
  if (value <= 30) return '#EF4444'
  if (value <= 60) return '#F97316'
  if (value <= 85) return '#3B82F6'
  return '#8B5CF6'
}

export function understandingLabel(value) {
  if (value <= 30) return 'Inicial'
  if (value <= 60) return 'En progreso'
  if (value <= 85) return 'Competente'
  return 'Avanzado'
}
