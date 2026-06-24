import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Lock } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { listStudentMedals, isSupabaseConfigured } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getAllAchievements } from '../lib/achievements'
import { useVoice } from '../context/VoiceContext'
import './Achievements.css'

const RARITY_COLOR = { common: '#A6A6BC', rare: '#3B82F6', epic: '#8B5CF6', legendary: '#F59E0B' }
const TYPE_ICON = { mastery: '👑', behavior: '🔥', secret: '🌟' }

export default function Achievements() {
  const navigate = useNavigate()
  const { studentId } = useAuth()
  const { setPageContext } = useVoice()
  const [earnedIds, setEarnedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured || !studentId) { setLoading(false); return }
      const { data } = await listStudentMedals(studentId)
      if (!cancelled) {
        setEarnedIds(new Set((data || []).map(m => m.achievement || m.name)))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [studentId])

  useEffect(() => { setPageContext({ page: 'achievements' }) }, [setPageContext])

  const catalog = getAllAchievements()
  const earnedCount = catalog.filter(a => earnedIds.has(a.id) || earnedIds.has(a.name)).length

  return (
    <PageWrapper className="achievements-page">
      <header className="achievements-header" role="banner" aria-label="Encabezado de logros">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={18} aria-hidden="true"/></button>
        <h1 className="achievements-title">Logros y Medallas</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{earnedCount}/{catalog.length}</span>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <Sparkles size={20} className="animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="achievements-grid" role="list" aria-label="Lista de medallas">
          {catalog.map(a => {
            const unlocked = earnedIds.has(a.id) || earnedIds.has(a.name)
            return (
              <div key={a.id} className={`achievement-card ${unlocked ? '' : 'locked'}`} role="listitem" style={{
                borderColor: unlocked ? `${RARITY_COLOR[a.rarity]}55` : 'var(--border-light)'
              }}>
                <div className="achievement-icon-wrap" style={{
                  background: unlocked ? `${RARITY_COLOR[a.rarity]}22` : 'var(--surface-3)',
                  boxShadow: unlocked ? `0 0 15px ${RARITY_COLOR[a.rarity]}44` : 'none'
                }}>
                  {unlocked ? (TYPE_ICON[a.type] || '🏅') : <Lock size={24} color="var(--text-dim)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="achievement-card-title" style={{ color: unlocked ? 'var(--text)' : 'var(--text-dim)' }}>
                    {a.name}
                  </h3>
                  <p className="achievement-card-desc">{a.description}</p>
                  <span style={{
                    fontSize: '0.7rem',
                    color: RARITY_COLOR[a.rarity],
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {a.rarity}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
