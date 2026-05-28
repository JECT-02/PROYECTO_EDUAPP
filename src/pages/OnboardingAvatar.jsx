import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Mascot from '../components/Mascot'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import './Onboarding.css'

const AVATARS = ['🦊','🐺','🦁','🐯','🦅','🐬','🦋','🌟']
const PETS = [
  { id:'dragon', emoji:'🐲', label:'Ember el Dragón', desc:'Feroz y apasionado', color:'#EF4444' },
  { id:'robot', emoji:'🤖', label:'Byte el Robot', desc:'Lógico y preciso', color:'#3B82F6' },
  { id:'owl', emoji:'🦉', label:'Sage el Búho', desc:'Sabio y curioso', color:'#8B5CF6' },
]

export default function OnboardingAvatar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role || 'student'
  const isStudent = role === 'student'

  const [avatar, setAvatar] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eduapp_prefs')||'{}').avatar || '🦊' } catch { return '🦊' }
  })
  const [pet, setPet] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eduapp_prefs')||'{}').pet || 'dragon' } catch { return 'dragon' }
  })
  const [petName, setPetName] = useState('')
  const [loading, setLoading] = useState(false)

  const selected = PETS.find(p => p.id === pet)

  return (
    <PageWrapper>
      <div className="onboarding-page">
        <div className="onboarding-wrap">
          <div className="onboarding-header">
            <div className="onb-logo">✦ EduApp</div>
            <div className="onb-step-badge">Paso 2 de 2</div>
          </div>

          <div className="onb-hero">
            <h1>{isStudent ? 'Tu avatar y mascota' : 'Tu avatar'}</h1>
            <p>{isStudent
              ? 'Elige cómo te verán y quién te acompañará en tu aventura de aprendizaje.'
              : 'Elige cómo te verán los demás en la plataforma.'}</p>
          </div>

          {/* Avatar selector */}
          <div className="avatar-section">
            <h3 className="section-label">Tu avatar</h3>
            <div className="avatar-grid">
              {AVATARS.map(a => (
                <div
                  key={a} className={`avatar-option ${avatar===a?'selected':''}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* Pet selector — solo para estudiantes */}
          {isStudent && (
            <div className="pet-section">
              <h3 className="section-label">Tu mascota compañera</h3>
              <div className="pet-cards">
                {PETS.map(p => (
                  <div
                    key={p.id}
                    className={`pet-card ${pet===p.id?'selected':''}`}
                    style={{'--pet-color': p.color}}
                    onClick={() => setPet(p.id)}
                  >
                    <div className="pet-preview">
                      <Mascot type={p.id} size="md" />
                    </div>
                    <div className="pet-label">{p.label}</div>
                    <div className="pet-desc">{p.desc}</div>
                  </div>
                ))}
              </div>

              {/* Pet name */}
              <div className="pet-name-row">
                <label className="section-label"> ¿Tienes otro nombre en mente para tu mascota?</label>
                <input
                  type="text" className="input-field" maxLength={12}
                  placeholder={`Ej: Connor`}
                  value={petName} onChange={e => setPetName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="onb-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/onboarding/accessibility')}>
              Atrás
            </button>
            <button
              className={`btn btn-primary btn-lg ${loading?'loading':''}`}
              disabled={loading}
              onClick={() => {
                setLoading(true)
                const prefs = JSON.parse(localStorage.getItem('eduapp_prefs')||'{}')
                prefs.avatar = avatar
                if (isStudent) {
                  prefs.pet = pet
                  prefs.petName = petName
                }
                prefs[`onboardingCompleted_${role}`] = true
                localStorage.setItem('eduapp_prefs', JSON.stringify(prefs))
                const redirectMap = { teacher: '/teacher', student: '/dashboard', parent: '/parent' }
                setTimeout(() => navigate(redirectMap[role] || '/dashboard'), 1500)
              }}
            >
              {loading ? <span className="spinner"/> : '¡Comenzar mi viaje!'}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
