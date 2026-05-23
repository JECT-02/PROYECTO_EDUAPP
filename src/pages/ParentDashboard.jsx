import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Clock, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import PageWrapper from '../components/PageWrapper'

const data = [
  { name: 'Lun', mins: 45 }, { name: 'Mar', mins: 60 }, { name: 'Mié', mins: 30 },
  { name: 'Jue', mins: 80 }, { name: 'Vie', mins: 40 }, { name: 'Sáb', mins: 120 }, { name: 'Dom', mins: 0 }
]

export default function ParentDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <PageWrapper>
      <Header />
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 24 }}>Panel de Padres</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* Linked student */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Users size={18}/> Estudiantes Vinculados</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--surface-2)', borderRadius: 8 }}>
              <div style={{ fontSize: '2rem' }}>🦊</div>
              <div>
                <h4 style={{ fontSize: '1.1rem' }}>Sofía García</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nivel de entendimiento Promedio: 72%</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: 4 }}>Última vez hoy</div>
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Clock size={18}/> Tiempo de Estudio (Semana)</h3>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <XAxis dataKey="name" stroke="#6B6D8A" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1A1935', border: 'none', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="mins" stroke="#6C63FF" strokeWidth={3} dot={{ fill: '#6C63FF' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={() => { logout(); navigate('/login'); }}>
          <LogOut size={16}/> Cerrar sesion
        </button>
      </div>
    </PageWrapper>
  )
}
