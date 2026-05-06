import { useEffect, useRef } from 'react'

export default function StarsBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const count = 80
    container.innerHTML = ''
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      const size = Math.random() * 3 + 1
      star.style.cssText = `
        width:${size}px; height:${size}px;
        top:${Math.random() * 100}%; left:${Math.random() * 100}%;
        --dur:${Math.random() * 4 + 2}s; --delay:${Math.random() * 4}s;
        opacity:${Math.random() * 0.7 + 0.1};
      `
      container.appendChild(star)
    }
  }, [])

  return <div className="stars-bg" ref={containerRef} />
}
