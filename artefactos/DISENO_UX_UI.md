# EduApp — Sistema de Diseño UX/UI v2.0

> Documento de especificación de diseño. Versión 2.0 — 24/06/2026.
> Audiencia: equipo de desarrollo, diseñadores, stakeholders técnicos.

---

## 1. Filosofia Visual

La plataforma adopta un estilo editorial oscuro premium con acentos esmeralda y purpura.
El fondo del body se compone de tres capas CSS superpuestas:

```css
body {
  background-color: #080814;
  background-image:
    linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(108,99,255,0.03) 1px, transparent 1px),
    linear-gradient(135deg,
      rgba(16,185,129,0.04),
      rgba(108,99,255,0.03) 35%,
      rgba(16,185,129,0.04) 55%,
      rgba(16,185,129,0.03) 80%,
      rgba(108,99,255,0.06)
    );
  background-size: 60px 60px, 60px 60px, 100% 100%;
}
```

Principios rectores: contraste alto (relacion minima 7:1), gradientes sutiles (opacidad 0.02-0.06), fondos solidos (sin glassmorphism). `backdrop-filter: blur()` esta prohibido.

---

## 2. Sistema Tipografico

### 2.1 Fuentes

| Elemento | Font Family | Font Weight | Font Size | Letter Spacing |
|----------|-------------|-------------|-----------|----------------|
| Headings | Epilogue | 700-900 | 1.0rem-2.5rem | -0.02em |
| Body text | Plus Jakarta Sans | 400 | 0.9rem-0.95rem | 0 |
| Labels | Plus Jakarta Sans | 600 | 0.85rem | 0.04em (uppercase) |
| Buttons | Plus Jakarta Sans | 600-800 | 0.85rem-1.1rem | 0.01em |
| Code/IDs | SF Mono, Fira Code | - | - | - |

### 2.2 Carga

```css
@import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
```

---

## 3. Paleta de Color

### 3.1 Colores de Marca

| Token | Hex | Uso |
|-------|-----|-----|
| --primary | #6C63FF | Botones primarios, hover states, iconos |
| --primary-light | #CAC7FF | Texto hover, focus outlines |
| --primary-dark | #4B44CC | Hover profundo de boton primario |
| --emerald | #10B981 | Color de marca. Bordes, gradientes, indicadores |
| --emerald-light | #34D399 | Gradient text, progress fills |
| --emerald-dark | #059669 | Boton emerald, gradientes |
| --purple | #8B5CF6 | Gradientes secundarios, AI cards |
| --accent | #F59E0B | Logros, coliseo, highlights |
| --accent-light | #FCD34D | Boton accent (texto oscuro) |
| --success | #3CAF66 | Correcto, completado |
| --error | #EF4444 | Error, incorrecto |
| --warning | #F97316 | Advertencia, tiempo bajo |

### 3.2 Fondos

| Token | Hex | Uso |
|-------|-----|-----|
| --bg | #0A0A14 | Body |
| --bg-2 | #0E0E1F | Scrollbar track |
| --surface | #151518 | Cards internas, inputs |
| --surface-2 | #1C1C22 | Hover states |
| --surface-3 | #262630 | Scrollbar thumb, progress bg |

### 3.3 Texto

| Token | Hex | Ratio contraste (sobre --bg) |
|-------|-----|------------------------------|
| --text | #F0F0F5 | 15.4:1 |
| --text-muted | #A6A6BC | 8.2:1 |
| --text-dim | #BBBBC7 | 10.1:1 |

### 3.4 Bordes

| Token | Valor |
|-------|-------|
| --border | rgba(16,185,129,0.15) |
| --border-light | rgba(255,255,255,0.06) |

---

## 4. Sistema de Cards (3 niveles)

### 4.1 Card Principal (contenedor de formulario)

```css
.card-main {
  background: linear-gradient(170deg, #080814, #0A0A14);
  border-radius: 28px; /* --radius-xl */
  position: relative; z-index: 0; overflow: hidden;
  box-shadow: 0 0 0 1px rgba(16,185,129,0.02) inset;
}
.card-main::before {
  content: ''; position: absolute; inset: 0; border-radius: 28px;
  background: linear-gradient(135deg,
    rgba(16,185,129,0.05), rgba(108,99,255,0.06) 15%,
    rgba(16,185,129,0.04) 55%, rgba(16,185,129,0.02) 80%,
    rgba(108,99,255,0.06));
  pointer-events: none; z-index: -1;
}
.card-main > * { position: relative; z-index: 1; }
```

Aplicacion: `.login-form-wrap`, `.register-wrap`, `.onboarding-wrap`.

### 4.2 Card Interno (contenido secundario)

```css
.card-inner {
  background: var(--surface); /* #151518 */
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 20px; /* --radius-lg */
  position: relative; overflow: hidden;
  transition: all 0.2s ease;
}
.card-inner::before {
  content: ''; position: absolute; inset: 0; border-radius: 20px;
  background: linear-gradient(135deg, rgba(16,185,129,0.02), transparent 60%);
  pointer-events: none; z-index: 0;
}
.card-inner > * { position: relative; z-index: 1; }
.card-inner:hover {
  border-color: rgba(16,185,129,0.15);
  background: var(--surface-2);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}
```

Aplicacion: `.sidebar-card`, `.challenge-card`, `.course-card`, `.explore-card`, `.achievement-card`, `.stat-card`, `.settings-section`.

### 4.3 Card Interactivo (seleccionable)

```css
.card-interactive {
  cursor: pointer;
  transition: all 0.4s ease;
}
.card-interactive:hover {
  border-color: var(--role-color, var(--emerald));
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}
.card-interactive.selected {
  border-color: var(--role-color, var(--emerald));
  background: rgba(16,185,129,0.03);
  box-shadow: 0 8px 30px rgba(0,0,0,0.3),
              0 0 0 1px rgba(16,185,129,0.04) inset;
}
```

### 4.4 Gradiente overlay por contexto

| Contexto | Paginas | Gradiente ::before |
|----------|---------|-------------------|
| Esmeralda (default) | Dashboard, Explore, Achievements, Profile, Settings, Quiz | `linear-gradient(135deg, rgba(16,185,129,0.02), transparent 60%)` |
| Purpura | Lecciones, cursos | `linear-gradient(135deg, rgba(108,99,255,0.03), transparent 60%)` |
| Ambar | Coliseo | `linear-gradient(135deg, rgba(245,158,11,0.02), transparent 60%)` |
| Rojo | Review | `linear-gradient(135deg, rgba(239,68,68,0.02), transparent 60%)` |
| Multi-color | Login, Register, Onboarding | `linear-gradient(135deg, rgba(16,185,129,0.05), rgba(108,99,255,0.06) 15%, rgba(16,185,129,0.04) 55%, rgba(16,185,129,0.02) 80%, rgba(108,99,255,0.06))` |

---

## 5. Sistema de Botones

| Clase | Background | Hover | Texto |
|-------|-----------|-------|-------|
| `.btn-primary` | `linear-gradient(135deg, #6C63FF, #8B5CF6)` | translateY(-2px) | #FFF |
| `.btn-emerald` | `linear-gradient(135deg, #10B981, #059669)` | translateY(-2px) | #FFF |
| `.btn-accent` | `linear-gradient(135deg, #F59E0B, #FCD34D)` | translateY(-2px) | #1A1935 |
| `.btn-ghost` | Transparente + border --border-light | bg --surface, border --primary | --text-muted |
| `.btn-danger` | `linear-gradient(135deg, #EF4444, #DC2626)` | - | #FFF |
| `.btn-success` | `linear-gradient(135deg, #3CAF66, #23A754)` | - | #000 |

Modificadores de tamano: `.btn-lg` (16px 32px, 1.1rem), `.btn-sm` (8px 16px, 0.85rem). Estado disabled: `opacity: 0.5, cursor: not-allowed, transform: none`.

Icon buttons: 36x36px, border-radius 6px.

---

## 6. Inputs y Formularios

```css
.input-field {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 12px 16px;
  color: var(--text);
  font-size: 0.95rem;
  transition: all 0.2s ease;
  width: 100%;
}
.input-field:focus {
  border-color: var(--emerald);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
}
.input-field::placeholder { color: var(--text-dim); }
```

Input con icono: padding-left 42px, icono posicion absoluta left 14px. Toggle switch: 52x28px, slider con transicion 0.3s. Select: appearance none + chevron SVG.

---

## 7. Roadmap SVG Interactivo

### 7.1 Dimensiones

| Parametro | Desktop | Mobile |
|-----------|---------|--------|
| containerWidth | 1000px | 340px |
| nodeSpacing | 180px | 110px |
| nodeSize | 90px | 64px |

### 7.2 Tipos de Nodo

| Tipo | Hex Color | Radio | Icono |
|------|-----------|-------|-------|
| theory | #6C63FF | 24px | Book (lucide) |
| practice | #22C55E | 24px | Puzzle |
| quiz | #F59E0B | 28px | Zap |
| boss | #EF4444 | 36px | Trophy |
| reward | #EC4899 | 20px | Sparkles |

### 7.3 Estados de Nodo

| Estado | Opacidad | Efecto | Interaccion |
|--------|----------|--------|-------------|
| locked | 0.4 | Sin brillo | No clickable. Shake + vibracion |
| available | 1.0 | pulse-glow 2s infinite | Click: navega a leccion/quiz |
| in_progress | 1.0 | Borde blanco 3px + brillo | Click: continuar |
| completed | 1.0 | Check blanco interior | Click: resumen con score |

### 7.4 Curva del Camino

```javascript
function generateSVGPath(count) {
  const start = getNodePos(0);
  let d = `M ${start.x} ${start.y}`;
  for (let i = 0; i < count - 1; i++) {
    const current = getNodePos(i);
    const next = getNodePos(i + 1);
    const cp1y = current.y + nodeSpacing / 2;
    const cp2y = next.y - nodeSpacing / 2;
    d += ` C ${current.x} ${cp1y}, ${next.x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return d;
}
function getNodePos(index) {
  const x = Math.sin(index * 1.1) * (pathWidth / 2);
  const y = index * nodeSpacing + 100;
  return { x: containerWidth / 2 + x, y };
}
```

---

## 8. Quiz y Coliseo

### 8.1 Quiz

Header: boton cerrar, progress bar (qIndex/total), timer (00:30, color rojo si < 10s).

```css
.quiz-opt-btn {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 6px;
  background: var(--surface); border: 1px solid var(--border-light);
  color: var(--text); cursor: pointer; width: 100%;
}
.quiz-opt-btn:hover { border-color: var(--primary); background: var(--surface-2); }
.quiz-opt-btn.correct { border-color: #22C55E; color: #22C55E; background: rgba(34,197,94,0.06); }
.quiz-opt-btn.incorrect { border-color: #EF4444; color: #EF4444; background: rgba(239,68,68,0.06); }
.quiz-opt-btn.disabled { opacity: 0.5; cursor: default; }
```

Score ring con conic-gradient: 120x120px, inner circle 90x90px.

### 8.2 Coliseo

Pantalla de entrada: icono Swords (ambar), texto gradiente "Coliseo de Retos", informacion (N preguntas, 30 min, 3 vidas, XP). Header durante juego: ronda actual, timer, corazones (3). Pantalla de victoria: trofeo, XP ganado, score. Pantalla de derrota: reintentar o salir.

---

## 9. Animaciones

| Clase CSS | Keyframe | Duracion | Iteracion |
|-----------|----------|----------|-----------|
| .animate-float | float (translateY -10px) | 3s | infinite |
| .animate-pulse-glow | pulse-glow (box-shadow) | 2s | infinite |
| .animate-pulse-glow-gold | pulse-glow-gold (filter) | 2s | infinite |
| .animate-spin | spin (360deg) | 0.8s | infinite |
| .animate-fadeInUp | fadeInUp (opacity + Y) | 0.5s | 1 |
| .animate-scaleIn | scaleIn (0.8 a 1) | 0.3s | 1 |

Transiciones de pagina (framer-motion): opacity 0 a 1 + Y 16px a 0, duration 0.35s easeOut. Exit: opacity 1 a 0 + Y 0 a -16px, duration 0.2s.

---

## 10. Modos de Accesibilidad

### 10.1 Alto Contraste

Clase `.high-contrast` en body. Transformaciones:
- --bg: #000000 (desde #0A0A14)
- --surface: #0D0D0D (desde #151518)
- --text: #FFFFFF (desde #F0F0F5)
- --border-light: rgba(255,255,255,0.18)
- Todos los contrastes superan 10:1 (WCAG AAA)

### 10.2 Reducir Animaciones

Clase `.reduce-motion`. Anula animaciones: `animation-duration: 0.01ms !important`, `transition-duration: 0.01ms !important`. Estrellas ocultas. Hover transforms desactivados. `prefers-reduced-motion` del sistema tambien se respeta via media query.

### 10.3 Texto Grande

Clase `.large-text`. Font-size base a 18px. Botones, inputs, labels incrementados proporcionalmente.

### 10.4 Modo Daltonico

Clase `.colorblind`. Paleta Viridis (perceptually uniform):
- --emerald: #21918C (teal)
- --error: #F97316 (naranja, universalmente distinguible)
- --success: #21918C (teal)

### 10.5 WCAG 2.1 AA

| Criterio | Estado | Implementacion |
|----------|--------|----------------|
| 1.1.1 Texto alternativo | OK | ARIA labels, aria-hidden en decorativos |
| 1.4.1 Uso del color | OK | Error: X + texto + color |
| 1.4.3 Contraste minimo 4.5:1 | OK | 7:1 a 15.4:1 en modo normal |
| 1.4.4 Cambiar tamano texto 200% | OK | Modo texto grande + responsive |
| 2.1.1 Teclado | OK | Tab order, focus visible, skip link |
| 2.2.2 Pausar movimiento | OK | reduce-motion + prefers-reduced-motion |
| 2.4.1 Saltar bloques | OK | Skip link a #main-content |
| 2.4.3 Orden del foco | OK | Tab order logico |
| 2.4.7 Foco visible | OK | :focus-visible outline 2px |
| 3.3.1 Identificacion errores | OK | form-error con icono + texto |
| 4.1.2 Nombre, rol, valor | OK | ARIA roles y atributos |
| 4.1.3 Mensajes de estado | OK | aria-live para quiz, timer, notificaciones |

---

## 11. Voice UI

### 11.1 VoiceIndicator (FAB)

Posicion: fixed, bottom 24px, right 24px, z-index 50. Estados visuales: idle (gris), active (pulsacion roja + ondas CSS), processing (spinner).

### 11.2 Chat con Tutor IA (Leccion)

Desktop: sidebar derecha fija. Mobile: modal flotante con boton trigger. Streaming SSE. Markdown renderizado. Historial de 6 mensajes. Input + send button + cancel button.

---

## 12. Prohibiciones de Diseno

| Prohibido | Razon | Alternativa |
|-----------|-------|-------------|
| backdrop-filter: blur() | Artefactos visuales en GPU | Fondos solidos var(--surface) |
| Clase .card global | Glass effects heredados | Estilos por componente |
| box-shadow: var(--shadow-emerald) | Glows verdes | Sombras neutras var(--shadow) |
| box-shadow: var(--shadow-purple) | Glows purpuras | Sombras neutras |
| rgba(255,255,255,0.01) como fondo | Sin relleno visible | var(--surface) |
| TypeScript en frontend | Proyecto es JS puro | JSX + JSDoc |
| Tailwind CSS | No es el stack | CSS modules por componente |
| CSS-in-JS | No es el stack | Archivos CSS separados |
