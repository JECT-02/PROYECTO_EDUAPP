import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'

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
    <PageWrapper style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
        <h1 style={{ fontSize: '1.8rem' }}>Logros y Medallas</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {ACHIEVEMENTS.map(a => (
          <div key={a.id} className="card" style={{ 
            padding: 24, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16,
            opacity: a.unlocked ? 1 : 0.5,
            filter: a.unlocked ? 'none' : 'grayscale(1)',
            borderColor: a.unlocked ? `${a.color}55` : 'var(--border-light)'
          }}>
            <div style={{ 
              fontSize: '2.5rem', 
              width: 64, height: 64, 
              borderRadius: '50%', 
              background: a.unlocked ? `${a.color}22` : 'var(--surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: a.unlocked ? `0 0 15px ${a.color}44` : 'none'
            }}>
              {a.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{a.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  )
}
