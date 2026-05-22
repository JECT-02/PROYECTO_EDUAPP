import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, Book, LogOut } from 'lucide-react'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'

export default function TeacherDashboard() {
  const navigate = useNavigate()

  return (
    <PageWrapper>
      <Header user={{ name: 'Prof. Ana Torres', avatar: '👩‍🏫' }} />
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: '2rem' }}>Panel Docente</h1>
            <p style={{ color: 'var(--text-muted)' }}>Bienvenida, aquí está el resumen de tus cursos.</p>
          </div>
          <button className="btn btn-primary">
            <Plus size={16}/> Crear nuevo curso
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Book size={18}/> Mis Cursos Activos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>Biología Celular (45 alumnos)</div>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>Anatomía Básica (32 alumnos)</div>
            </div>
          </div>

          <div className="card" style={{ padding: 24, borderColor: 'var(--warning)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--warning)' }}><AlertTriangle size={18}/> Alertas Recientes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8 }}>
                <strong>Juan P.</strong> - Dificultad persistente en "Mitocondria" (3 errores)
              </div>
              <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                <strong>María G.</strong> - 5 días inactiva
              </div>
            </div>
          </div>
        </div>
        
        <button className="btn btn-ghost" onClick={() => navigate('/login')}>
          <LogOut size={16}/> Volver al Login (Demo)
        </button>
      </div>
    </PageWrapper>
  )
}
