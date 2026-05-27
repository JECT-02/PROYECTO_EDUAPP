import { useEffect, useRef } from 'react'

export default function StarsBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const count = 60
    container.innerHTML = ''
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      const size = Math.random() * 1.5 + 1
      const baseOpacity = Math.random() * 0.3 + 0.05
      const isGroupA = Math.random() < 0.5
      const waveDelay = isGroupA ? 0 : -3
      star.style.cssText = `
        width:${size}px; height:${size}px;
        top:${Math.random() * 100}%; left:${Math.random() * 100}%;
        --dx:${(Math.random() - 0.5) * 120}px; --dy:${(Math.random() - 0.5) * 80}px;
        --drift-dur:${Math.random() * 15 + 15}s; --drift-delay:${Math.random() * 10}s;
        --wave-delay:${waveDelay}s;
        --base-op:${baseOpacity};
        opacity:${baseOpacity};
      `
      container.appendChild(star)
    }
  }, [])

  return <div className="stars-bg" ref={containerRef} />
}
