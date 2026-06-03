import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import './Achievements.css'

const ACHIEVEMENTS = [
  { id: 1, title: 'Maestro de la Célula', desc: 'Completaste el Coliseo con 100%', icon: '👑', color: '#F59E0B', unlocked: true },
  { id: 2, title: 'Explorador Curioso', desc: 'Hiciste clic en 5 palabras interactivas', icon: '🔍', color: '#3B82F6', unlocked: true },
  { id: 3, title: 'Racha de 7 días', desc: 'Estudiaste una semana seguida', icon: '🔥', color: '#EF4444', unlocked: true },
  { id: 4, title: 'Noctámbulo', desc: 'Estudiaste después de medianoche', icon: '🦉', color: '#8B5CF6', unlocked: false },
  { id: 5, title: 'Velocista', desc: 'Terminaste un Quiz en menos de 1 minuto', icon: '⚡', color: '#22C55E', unlocked: false },
  { id: 6, title: 'Perfeccionista', desc: '10 Quizzes seguidos sin errores', icon: '🎯', color: '#EC4899', unlocked: false },
]

export default function Achievements() {
  const navigate = useNavigate()

  return (
    <PageWrapper className="achievements-page">
      <header className="achievements-header" role="banner" aria-label="Encabezado de logros">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={18} aria-hidden="true"/></button>
        <h1 className="achievements-title">Logros y Medallas</h1>
      </header>

      <div className="achievements-grid" role="list" aria-label="Lista de medallas">
        {ACHIEVEMENTS.map(a => (
          <div key={a.id} className={`achievement-card ${a.unlocked ? '' : 'locked'}`} role="listitem" style={{ 
            borderColor: a.unlocked ? `${a.color}55` : 'var(--border-light)'
          }}>
            <div className="achievement-icon-wrap" style={{ 
              background: a.unlocked ? `${a.color}22` : 'var(--surface-3)',
              boxShadow: a.unlocked ? `0 0 15px ${a.color}44` : 'none'
            }}>
              {a.icon}
            </div>
            <div>
              <h3 className="achievement-card-title">{a.title}</h3>
              <p className="achievement-card-desc">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  )
}
