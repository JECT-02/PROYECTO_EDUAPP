/**
 * Nivel de Entendimiento — SPEC §2.4.3
 * S = (Nc * 0.40) + (P * 0.30) + (Ii * 0.20) + (Te * 0.10)
 */
export function calculateUnderstanding({ completedNodes, totalNodes, avgScore, aiInteractions, studyTimeMin }) {
  const Nc = totalNodes > 0 ? completedNodes / totalNodes : 0
  const P = avgScore != null && totalNodes > 0 ? Math.min(avgScore / 100, 1) : 0
  const Ii = Math.min((aiInteractions || 0) / 10, 1)
  const Te = Math.min((studyTimeMin || 0) / 120, 1)
  const value = (Nc * 0.40) + (P * 0.30) + (Ii * 0.20) + (Te * 0.10)
  return {
    value: Math.round(value * 100),
    Nc: Math.round(Nc * 100),
    P: Math.round(P * 100),
    Ii: Math.round(Ii * 100),
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
