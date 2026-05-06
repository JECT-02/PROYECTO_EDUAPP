import './Mascot.css'

const mascots = {
  dragon: { emoji: '🐲', color: '#EF4444', name: 'Ember' },
  robot: { emoji: '🤖', color: '#3B82F6', name: 'Byte' },
  owl: { emoji: '🦉', color: '#8B5CF6', name: 'Sage' },
}

export default function Mascot({ type = 'dragon', mood = 'normal', size = 'md', message = null, name }) {
  const m = mascots[type] || mascots.dragon
  const sizeMap = { sm: 48, md: 72, lg: 100 }
  const px = sizeMap[size] || 72

  const moodClass = {
    normal: 'animate-float',
    happy: 'mascot-bounce',
    sad: 'mascot-sad',
    worried: 'mascot-worried',
  }[mood] || 'animate-float'

  return (
    <div className="mascot-wrapper">
      <div
        className={`mascot-body ${moodClass}`}
        style={{
          width: px, height: px,
          background: `radial-gradient(circle at 35% 35%, ${m.color}44, ${m.color}11)`,
          borderRadius: '50%',
          border: `2px solid ${m.color}44`,
          boxShadow: `0 0 20px ${m.color}33`,
          fontSize: px * 0.55,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'default',
        }}
      >
        {m.emoji}
      </div>
      {message && (
        <div className="mascot-bubble">
          <p>{message}</p>
          <div className="bubble-tail" />
        </div>
      )}
      {name && <div className="mascot-name" style={{ color: m.color }}>{name || m.name}</div>}
    </div>
  )
}
