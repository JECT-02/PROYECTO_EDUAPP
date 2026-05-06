import { useNavigate } from 'react-router-dom'
import { Search, Filter, BookOpen } from 'lucide-react'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'

const CATALOG = [
  { id: 1, title: 'Física Cuántica Básica', teacher: 'Dr. Silva', level: '15-17', tags: ['Ciencias'], emoji: '⚛️' },
  { id: 2, title: 'Arte del Renacimiento', teacher: 'Prof. Rossi', level: '11-14', tags: ['Arte', 'Historia'], emoji: '🎨' },
  { id: 3, title: 'Introducción a la Robótica', teacher: 'Ing. Chen', level: 'Todos', tags: ['Tecnología'], emoji: '🤖' },
  { id: 4, title: 'Literatura Clásica', teacher: 'Dra. Méndez', level: '18+', tags: ['Letras'], emoji: '📚' }
]

export default function Explore() {
  const navigate = useNavigate()

  return (
    <PageWrapper>
      <Header />
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 24 }}>Explorar Catálogo</h1>
        
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <div className="input-icon-wrap" style={{ flex: 1, maxWidth: 400 }}>
            <Search size={16} className="input-icon" />
            <input type="text" className="input-field with-icon" placeholder="Buscar cursos..." />
          </div>
          <button className="btn btn-ghost"><Filter size={16}/> Filtros</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {CATALOG.map(c => (
            <div key={c.id} className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              <div style={{ height: 120, background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(139,92,246,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                {c.emoji}
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {c.tags.map(t => <span key={t} className="badge badge-purple">{t}</span>)}
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{c.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>{c.teacher}</p>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <BookOpen size={16} /> Inscribirme
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
