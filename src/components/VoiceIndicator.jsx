import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { useVoice } from '../context/VoiceContext'

export default function VoiceIndicator() {
  const { voiceEnabled, listening, audioLevel, status, feedback, transcript, error, isVoiceSupported } = useVoice()

  if (!isVoiceSupported() || !voiceEnabled) return null

  const isProcessing = status === 'processing'
  const isActive = status === 'active' || listening

  return (
    <>
      {/* Screen reader announcements */}
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {isActive ? 'Escuchando' : isProcessing ? 'Procesando' : feedback ? feedback : error ? error : ''}
      </div>

      {/* Subtle mic indicator */}
      <div
        role="status"
        aria-label={isActive ? 'Micrófono activo, escuchando' : isProcessing ? 'Procesando comando' : 'Micrófono en espera'}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <div style={{
          width: isActive ? 44 + audioLevel * 120 : 36,
          height: isActive ? 44 + audioLevel * 120 : 36,
          borderRadius: '50%',
          background: isActive
            ? `rgba(108,99,255,${0.15 + audioLevel * 2})`
            : isProcessing
              ? 'rgba(245,158,11,0.15)'
              : 'rgba(108,99,255,0.08)',
          border: isActive
            ? `2px solid rgba(108,99,255,${0.3 + audioLevel * 2})`
            : isProcessing
              ? '2px solid rgba(245,158,11,0.3)'
              : '2px solid rgba(108,99,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
        }}>
          {isProcessing
            ? <Volume2 size={16} color="var(--amber)" />
            : isActive
              ? <Mic size={16} color="var(--primary-light)" />
              : <Mic size={14} color="var(--text-dim)" opacity={0.5} />
          }
        </div>
      </div>

      {/* Feedback toast (auto-dismissed, for debug/confirmation) */}
      <AnimatePresence>
        {(feedback || error) && !isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'fixed',
              bottom: 72,
              left: 24,
              zIndex: 1000,
              background: 'var(--surface)',
              border: error ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(34,197,94,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              maxWidth: 280,
              fontSize: '0.82rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {error ? (
              <span style={{ color: '#FCA5A5' }}>{error}</span>
            ) : (
              <span style={{ color: 'var(--text)' }}>{feedback}</span>
            )}
            {transcript && !error && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 4 }}>
                &ldquo;{transcript.length > 80 ? transcript.slice(0, 80) + '...' : transcript}&rdquo;
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
