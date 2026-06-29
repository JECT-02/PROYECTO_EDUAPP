import { useState, useEffect, useMemo } from 'react'
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
        const ids = new Set()
        for (const m of (data || [])) {
          if (m.achievement) ids.add(m.achievement.toLowerCase())
          if (m.name) ids.add(m.name.toLowerCase())
        }
        setEarnedIds(ids)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [studentId])

  useEffect(() => { setPageContext({ page: 'achievements' }) }, [setPageContext])

  const catalog = getAllAchievements()
  const earnedCount = catalog.filter(a => earnedIds.has(a.id?.toLowerCase()) || earnedIds.has(a.name?.toLowerCase())).length

  const earnedList = useMemo(() => catalog.filter(a => earnedIds.has(a.id?.toLowerCase()) || earnedIds.has(a.name?.toLowerCase())), [catalog, earnedIds])
  const pendingList = useMemo(() => catalog.filter(a => !earnedIds.has(a.id?.toLowerCase()) && !earnedIds.has(a.name?.toLowerCase())), [catalog, earnedIds])

  return (
    <PageWrapper className="achievements-page">
      <header className="achievements-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={18} aria-hidden="true"/></button>
        <h1 className="achievements-title" tabIndex={-1}>Logros y Medallas</h1>
        <span
          aria-hidden="true"
          style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          {earnedCount}/{catalog.length}
        </span>
      </header>

      {loading ? (
        <div role="status" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <Sparkles size={20} aria-hidden="true" className="animate-spin" /> Cargando logros...
        </div>
      ) : (
        <>
          <div className="achievements-grid">
            {[...earnedList, ...pendingList].map(a => {
              const unlocked = earnedIds.has(a.id?.toLowerCase()) || earnedIds.has(a.name?.toLowerCase())
              const rarityLabel = a.rarity === 'common' ? 'Común' : a.rarity === 'rare' ? 'Rara' : a.rarity === 'epic' ? 'Épica' : 'Legendaria'
              const statusLabel = unlocked ? 'Completado' : 'No completado'
              return (
                <div
                  key={a.id}
                  className={`achievement-card ${unlocked ? '' : 'locked'}`}
                  tabIndex={0}
                  style={{
                    borderColor: unlocked ? `${RARITY_COLOR[a.rarity]}55` : 'var(--border-light)'
                  }}
                >
                  <div className="achievement-icon-wrap" style={{
                    background: unlocked ? `${RARITY_COLOR[a.rarity]}22` : 'var(--surface-3)',
                    boxShadow: unlocked ? `0 0 15px ${RARITY_COLOR[a.rarity]}44` : 'none'
                  }}>
                    {unlocked
                    ? <span aria-hidden="true">{TYPE_ICON[a.type] || '🏅'}</span>
                    : <Lock size={24} aria-hidden="true" color="var(--text-dim)" />
                  }
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 className="achievement-card-title" style={{ color: unlocked ? 'var(--text)' : 'var(--text-dim)' }}>
                      {a.name}
                    </h3>
                    <p className="achievement-card-desc">{a.description}</p>
                    <span className="visually-hidden">Rareza {rarityLabel}, {statusLabel}</span>
                    <span aria-hidden="true" style={{
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
        </>
      )}
    </PageWrapper>
  )
}
