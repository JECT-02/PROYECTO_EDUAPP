let audioContext = null
let analyser = null
let microphone = null
let silenceTimer = null
let maxRecordTimer = null
let recording = false
let speechDetected = false
let levelCheckInterval = null
let mediaRecorder = null
let audioChunks = []
let stream = null

const SILENCE_THRESHOLD = 0.015
const SILENCE_DURATION = 2000     // ms of silence before processing
const MAX_RECORDING = 15000
const LEVEL_CHECK_MS = 80

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001'

let onStartCallback = null
let onStopCallback = null
let onLevelCallback = null

export async function startContinuousListening({ onSpeechStart, onSpeechEnd, onLevel }) {
  if (audioContext && audioContext.state !== 'closed') return

  onStartCallback = onSpeechStart
  onStopCallback = onSpeechEnd
  onLevelCallback = onLevel

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    })
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    microphone = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.3
    microphone.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)

    levelCheckInterval = setInterval(() => {
      if (!analyser) return
      analyser.getFloatTimeDomainData(dataArray)

      let sum = 0
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i] * dataArray[i]
      const rms = Math.sqrt(sum / bufferLength)

      if (onLevelCallback) onLevelCallback(rms)

      if (rms > SILENCE_THRESHOLD) {
        // === SPEECH DETECTED ===
        clearTimer('silence')
        if (!recording) {
          speechDetected = true
          startAudioRecording()
          clearTimer('maxRecord')
          maxRecordTimer = setTimeout(forceStopRecording, MAX_RECORDING)
        }
      } else if (recording && speechDetected) {
        // === SILENCE WHILE RECORDING ===
        if (!silenceTimer) {
          silenceTimer = setTimeout(() => stopAndProcess(), SILENCE_DURATION)
        }
      }
    }, LEVEL_CHECK_MS)

    return true
  } catch (err) {
    console.warn('[voice] mic access denied:', err.message)
    return false
  }
}

function clearTimer(type) {
  if (type === 'silence') { if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null } }
  if (type === 'maxRecord') { if (maxRecordTimer) { clearTimeout(maxRecordTimer); maxRecordTimer = null } }
}

function startAudioRecording() {
  audioChunks = []
  try {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data) }
    mediaRecorder.start(250)
    recording = true
    if (onStartCallback) onStartCallback()
  } catch (err) {
    console.warn('[voice] record start error:', err.message)
  }
}

function forceStopRecording() {
  clearTimer('maxRecord')
  clearTimer('silence')
  if (!recording) return
  _doStop()
}

function stopAndProcess() {
  clearTimer('silence')
  clearTimer('maxRecord')
  if (!recording) return
  _doStop()
}

function _doStop() {
  recording = false
  speechDetected = false
  if (!mediaRecorder || mediaRecorder.state !== 'recording') {
    if (onStopCallback) onStopCallback(null)
    return
  }
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' })
    audioChunks = []
    if (onStopCallback) {
      await onStopCallback(blob.size > 200 ? blob : null)
    }
  }
  try { mediaRecorder.stop() } catch {}
}

export function stopContinuousListening() {
  if (levelCheckInterval) { clearInterval(levelCheckInterval); levelCheckInterval = null }
  clearTimer('silence')
  clearTimer('maxRecord')
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try { mediaRecorder.stop() } catch {}
  }
  recording = false
  speechDetected = false
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  if (audioContext && audioContext.state !== 'closed') { try { audioContext.close() } catch {}; audioContext = null }
  microphone = null
  analyser = null
  mediaRecorder = null
  onStartCallback = null
  onStopCallback = null
  onLevelCallback = null
}

/**
 * Send audio blob to ai-backend for Groq STT transcription.
 */
export async function transcribe(audioBlob) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  const res = await fetch(`${AI_BACKEND_URL}/api/voice/transcribe`, {
    method: 'POST',
    headers: { 'X-API-Key': import.meta.env.VITE_AI_API_KEY || 'eduapp-dev-key' },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.text || ''
}

/**
 * Categorize transcript into action via Groq.
 */
export async function categorize(transcript, context = {}) {
  const res = await fetch(`${AI_BACKEND_URL}/api/voice/categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': import.meta.env.VITE_AI_API_KEY || 'eduapp-dev-key' },
    body: JSON.stringify({ transcript, context }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function askVoiceQuestion(question, context = '') {
  const res = await fetch(`${AI_BACKEND_URL}/api/voice/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': import.meta.env.VITE_AI_API_KEY || 'eduapp-dev-key' },
    body: JSON.stringify({ question, context }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.answer || ''
}

let synth = null

export function speak(text, options = {}) {
  if (!window.speechSynthesis) return false
  window.speechSynthesis.cancel()
  synth = new SpeechSynthesisUtterance(text)
  synth.lang = options.lang || 'es-ES'
  synth.rate = options.rate || 1.0
  synth.pitch = options.pitch || 1.0
  synth.volume = options.volume ?? 1.0
  window.speechSynthesis.speak(synth)
  return true
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

export function isVoiceSupported() {
  return !!(navigator.mediaDevices?.getUserMedia && window.AudioContext && window.MediaRecorder)
}

let lastSpoken = ''
export function setLastSpoken(text) { lastSpoken = text }
export function getLastSpoken() { return lastSpoken }
export function getAnalyser() { return analyser }
