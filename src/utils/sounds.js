/**
 * Sound effects system using Web Audio API.
 * All sounds check localStorage pref 'sound' before playing.
 */

function isSoundEnabled() {
  try {
    const prefs = JSON.parse(localStorage.getItem('eduapp_prefs') || '{}')
    return !!prefs.sound
  } catch {
    return false
  }
}

let _audioCtx = null

function getContext() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume if suspended (browser autoplay policy requires user gesture)
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume()
  }
  return _audioCtx
}

/**
 * Initialize audio context on user gesture.
 * Call this on first click to ensure AudioContext is ready.
 */
export function initAudio() {
  try {
    const ctx = getContext()
    // Force running state
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* ignore */ }
}

/**
 * Play a correct answer "ding" - bright, short chime
 */
export function playCorrect() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)       // A5
    osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1) // C#6
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch { /* ignore audio errors */ }
}

/**
 * Play an incorrect answer tone - low buzz 200Hz, 300ms
 */
export function playIncorrect() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch { /* ignore audio errors */ }
}

/**
 * Play a timeout alert - descending tone
 */
export function playTimeout() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'square'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch { /* ignore audio errors */ }
}

/**
 * Play victory fanfare - ascending arpeggio
 */
export function playVictory() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getContext()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      const startTime = ctx.currentTime + i * 0.15
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4)

      osc.start(startTime)
      osc.stop(startTime + 0.4)
    })
  } catch { /* ignore audio errors */ }
}
