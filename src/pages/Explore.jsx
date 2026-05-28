import { useNavigate } from 'react-router-dom'
import { Search, Filter, BookOpen } from 'lucide-react'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'
import './Explore.css'

const CATALOG = [
  { id: 1, title: 'Física Cuántica Básica', teacher: 'Dr. Silva', level: '15-17', tags: ['Ciencias'], emoji: '⚛️', color: '#6C63FF' },
  { id: 2, title: 'Arte del Renacimiento', teacher: 'Prof. Rossi', level: '11-14', tags: ['Arte', 'Historia'], emoji: '🎨', color: '#F59E0B' },
  { id: 3, title: 'Introducción a la Robótica', teacher: 'Ing. Chen', level: 'Todos', tags: ['Tecnología'], emoji: '🤖', color: '#22C55E' },
  { id: 4, title: 'Literatura Clásica', teacher: 'Dra. Méndez', level: '18+', tags: ['Letras'], emoji: '📚', color: '#EC4899' }
]

export default function Explore() {
  const navigate = useNavigate()

  return (
    <PageWrapper>
      <Header />
      <div className="explore-container">
        <h1 className="explore-title">Explorar Catálogo</h1>
        
        <div className="explore-toolbar">
          <div className="input-icon-wrap" style={{ flex: 1, maxWidth: 400 }}>
            <Search size={16} className="input-icon" />
            <input type="text" className="input-field with-icon" placeholder="Buscar cursos..." />
          </div>
          <button className="btn btn-ghost"><Filter size={16}/> Filtros</button>
        </div>

        <div className="explore-grid">
          {CATALOG.map(c => (
            <div key={c.id} className="explore-card" onClick={() => navigate('/dashboard')} style={{ '--course-color': c.color }}>
              <div className="explore-cover" style={{ background: `linear-gradient(135deg, ${c.color}33, ${c.color}11)` }}>
                {c.emoji}
              </div>
              <div className="explore-body">
                <div className="explore-tags">
                  {c.tags.map(t => <span key={t} className="badge badge-purple">{t}</span>)}
                </div>
                <h3 className="explore-card-title">{c.title}</h3>
                <p className="explore-card-teacher">{c.teacher}</p>
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
