/**
 * Haptic feedback system using the Vibration API.
 * All vibrations check localStorage pref 'vibration' before firing.
 *
 * Cada patrón tiene una sensación intencionalmente distinta:
 *
 * | Evento         | Patrón              | Sensación           |
 * |----------------|---------------------|---------------------|
 * | Locked         | [50, 50, 50]        | taps ligeros "no"   |
 * | Timeout        | [100, 100, 100]     | pulsos lentos pesados|
 * | Incorrect      | [60, 60, 60]        | rápido cortante ✘   |
 * | Correct        | [50, 50, 100, 50, 150] | rítmico alegre ✓ |
 * | Victory        | [100, 50, 100, 50, 100, 200] | celebración elaborada |
 * | Warning        | [200, 80, 200]      | dos zumbidos urgentes |
 *
 * Patterns from ee2.md (preservados):
 * - Nodo bloqueado:     [50, 50, 50]       — 2.4.2
 * - Timer agotado:      [100, 100, 100]     — 2.6.1
 * - Correcto:           [50, 50, 100, 50, 150] — 2.6.1
 * - Victoria/Maestría:  [100, 50, 100, 50, 100, 200] — 2.6.4
 */

function isVibrationEnabled() {
  try {
    const prefs = JSON.parse(localStorage.getItem('eduapp_prefs') || '{}')
    return !!prefs.vibration
  } catch {
    return false
  }
}

/**
 * Check if Vibration API is available
 */
function canVibrate() {
  return 'vibrate' in navigator || 'webkitVibrate' in navigator
}

function doVibrate(pattern) {
  if (!isVibrationEnabled()) return
  if (!canVibrate()) return
  try {
    navigator.vibrate(pattern)
  } catch { /* ignore */ }
}

/**
 * Nodo bloqueado en roadmap — shake animation companion
 * Pattern: [50, 50, 50]
 */
export function vibrateLocked() {
  doVibrate([50, 50, 50])
}

/**
 * Timer agotado en quiz — advertencia de tiempo
 * Pattern: [100, 100, 100]
 * Especificado en ee2.md sección 2.6.1
 */
export function vibrateTimeout() {
  doVibrate([100, 100, 100])
}

/**
 * Respuesta incorrecta — feedback rápido y cortante
 * Pattern: [60, 60, 60]
 * Diferente del timeout (pulsos lentos [100,100,100]) para que el usuario distinga
 * entre "se acabó el tiempo" y "respuesta equivocada"
 */
export function vibrateIncorrect() {
  doVibrate([60, 60, 60])
}

/**
 * Respuesta correcta — celebración sutil
 * Pattern: [50, 50, 100, 50, 150]
 */
export function vibrateCorrect() {
  doVibrate([50, 50, 100, 50, 150])
}

/**
 * Victoria en Coliseo / Maestría Lograda
 * Pattern: [100, 50, 100, 50, 100, 200]
 */
export function vibrateVictory() {
  doVibrate([100, 50, 100, 50, 100, 200])
}

/**
 * Advertencia por desempeño bajo (score < 40%)
 * Pattern: [200, 80, 200] — dos zumbidos largos, sensación urgente
 * Diferente de todos los demás: más largo y alarmante
 */
export function vibrateWarning() {
  doVibrate([200, 80, 200])
}
