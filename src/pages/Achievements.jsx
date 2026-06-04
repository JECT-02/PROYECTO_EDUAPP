import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { listStudentMedals, isSupabaseConfigured } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import './Achievements.css'

const RARITY_COLOR = {
  common: '#A6A6BC',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
}
const RARITY_ICON = {
  mastery: '👑',
  behavior: '🔥',
  secret: '🌟',
}
const FALLBACK = [
  { id: 1, title: 'Maestro de la Célula', desc: 'Completaste el Coliseo con 100%', icon: '👑', color: '#F59E0B', unlocked: true },
  { id: 2, title: 'Explorador Curioso', desc: 'Hiciste clic en 5 palabras interactivas', icon: '🔍', color: '#3B82F6', unlocked: true },
  { id: 3, title: 'Racha de 7 días', desc: 'Estudiaste una semana seguida', icon: '🔥', color: '#EF4444', unlocked: true },
  { id: 4, title: 'Noctámbulo', desc: 'Estudiaste después de medianoche', icon: '🦉', color: '#8B5CF6', unlocked: false },
  { id: 5, title: 'Velocista', desc: 'Terminaste un Quiz en menos de 1 minuto', icon: '⚡', color: '#22C55E', unlocked: false },
  { id: 6, title: 'Perfeccionista', desc: '10 Quizzes seguidos sin errores', icon: '🎯', color: '#EC4899', unlocked: false },
]

export default function Achievements() {
  const navigate = useNavigate()
  const { studentId } = useAuth()
  const [medals, setMedals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured || !studentId) {
        setLoading(false)
        return
      }
      const { data } = await listStudentMedals(studentId)
      if (!cancelled) {
        setMedals(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [studentId])

  const list = medals.length > 0
    ? medals.map((m) => ({
        id: m.id,
        title: m.name || m.medal_type,
        desc: m.rarity ? `Rareza: ${m.rarity}` : '',
        icon: RARITY_ICON[m.medal_type] || '🏅',
        color: RARITY_COLOR[m.rarity] || '#6C63FF',
        unlocked: true,
        svg_url: m.svg_url,
      }))
    : FALLBACK

  return (
    <PageWrapper className="achievements-page">
      <header className="achievements-header">
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 className="achievements-title">Logros y Medallas</h1>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <Sparkles size={20} /> Cargando...
        </div>
      ) : (
        <div className="achievements-grid">
          {list.map(a => (
            <div key={a.id} className={`achievement-card ${a.unlocked ? '' : 'locked'}`} style={{
              borderColor: a.unlocked ? `${a.color}55` : 'var(--border-light)'
            }}>
              <div className="achievement-icon-wrap" style={{
                background: a.unlocked ? `${a.color}22` : 'var(--surface-3)',
                boxShadow: a.unlocked ? `0 0 15px ${a.color}44` : 'none'
              }}>
                {a.svg_url ? <img src={a.svg_url} alt={a.title} style={{ width: '100%' }} /> : a.icon}
              </div>
              <div>
                <h3 className="achievement-card-title">{a.title}</h3>
                <p className="achievement-card-desc">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
