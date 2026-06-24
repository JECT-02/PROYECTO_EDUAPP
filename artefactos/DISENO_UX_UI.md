# EduApp — Sistema de Diseño UX/UI

> Diseño editorial oscuro premium. Versión 1.0

---

## 1. Filosofía Visual

Estilo **editorial oscuro premium** con acentos esmeralda y púrpura. La interfaz evoca una revista de diseño combinada con una plataforma de aprendizaje futurista. Contraste alto, gradientes sutiles, sin glass effects ni fondos borrosos.

---

## 2. Tipografía

| Uso | Fuente | Pesos | Detalles |
|-----|--------|-------|----------|
| Headings / Títulos | `'Epilogue', sans-serif` | 700, 800, 900 | `letter-spacing: -0.02em` a `-0.03em` |
| Body / UI general | `'Plus Jakarta Sans', sans-serif` | 400, 500, 600, 700 | `letter-spacing: 0.01em` para botones |
| Labels / Badges | `'Plus Jakarta Sans', sans-serif` | 600, 700 | `text-transform: uppercase; letter-spacing: 0.04em-0.06em` |
| Códigos / IDs | `'SF Mono', 'Fira Code', monospace` | — | Solo para DNI, códigos, valores técnicos |

### Carga de fuentes
```css
@import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
```

---

## 3. Paleta de Color

### Colores principales

| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | `#6C63FF` | Purple principal, hover states, iconos |
| `--primary-light` | `#8B83FF` | Texto hover, iconos activos |
| `--emerald` | `#10B981` | Color principal de la marca. Bordes, gradientes, indicadores activos |
| `--emerald-light` | `#34D399` | Texto activo, gradient text |
| `--emerald-dark` | `#059669` | Gradientes de botones |
| `--purple` | `#8B5CF6` | Gradientes secundarios, AI cards |
| `--accent` | `#F59E0B` | Logros, coliseo, highlights especiales |
| `--success` | `#22C55E` | Correcto, completado |
| `--error` | `#EF4444` | Error, incorrecto, peligro |
| `--warning` | `#F97316` | Advertencia |

### Fondos

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#0A0A14` | Fondo de página (body) |
| `--bg-2` | `#0E0E1F` | Fondos secundarios |
| `--surface` | `#151518` | Cards internas, inputs, secciones |
| `--surface-2` | `#1C1C22` | Hover states |
| `--surface-3` | `#262630` | Scrollbar thumb, progress bar bg |

### Texto

| Token | Valor | Uso |
|-------|-------|-----|
| `--text` | `#F0F0F5` | Texto principal |
| `--text-muted` | `#9494B8` | Texto secundario, descripciones |
| `--text-dim` | `#5E5E7A` | Texto terciario, placeholders, labels |

---

## 4. Patrones de UI

### Cards — Sistema de 3 niveles

**Card principal** (contenedor tipo formulario):
- Fondo: gradiente 170deg `#080814` → `#0A0A14`
- Borde: sutil esmeralda `rgba(16,185,129,0.02)` inset
- `::before`: gradiente overlay esmeralda + púrpura
- Radio: `28px`

**Card interno** (contenido secundario):
- Fondo: `var(--surface)` sólido `#151518`
- Borde: `1px solid rgba(255,255,255,0.04)`
- `::before`: gradiente overlay de acento según contexto
- Hover: `var(--surface-2)`, `translateY(-2px)`, sombra
- Radio: `20px`

**Card interactivo** (seleccionable):
- Extiende card interno
- Hover: borde con `--role-color`, elevación
- Seleccionado: borde + background con el color del rol

### Contexto de gradiente overlay (`::before`)

| Contexto | Gradiente |
|----------|-----------|
| Default / Esmeralda (Dashboard, Explore, Quiz) | `linear-gradient(135deg, rgba(16,185,129,0.02), transparent 60%)` |
| Purple (Lecciones, cursos) | `linear-gradient(135deg, rgba(108,99,255,0.03), transparent 60%)` |
| Amber / Coliseo | `linear-gradient(135deg, rgba(245,158,11,0.02), transparent 60%)` |
| Red / Error (Review) | `linear-gradient(135deg, rgba(239,68,68,0.02), transparent 60%)` |
| Principal (contenedor) | Gradiente multi-color con emerald + purple |

---

## 5. Botones

| Clase | Fondo | Hover |
|-------|-------|-------|
| `btn-primary` | `linear-gradient(135deg, #6C63FF, #8B5CF6)` | `translateY(-2px)`, shadow intensifica |
| `btn-emerald` | `linear-gradient(135deg, #10B981, #059669)` | Igual |
| `btn-accent` | `linear-gradient(135deg, #F59E0B, #FCD34D)` | Igual (texto oscuro) |
| `btn-ghost` | Transparente, borde sutil | Bg `var(--surface)`, borde `--primary` |
| `btn-danger` | `linear-gradient(135deg, #EF4444, #DC2626)` | — |
| `btn-success` | `linear-gradient(135deg, #22C55E, #16A34A)` | — |

---

## 6. Inputs / Formularios

```css
.input-field {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 12px;
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

Labels: `font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;`

---

## 7. Nodos del Roadmap

| Tipo | Color | Radio | Ícono |
|------|-------|-------|-------|
| Teoría | Azul `#3B82F6` | 24px | 📖 Book |
| Quiz | Naranja `#F59E0B` | 28px | ⚡ Zap |
| Práctica | Verde `#22C55E` | 24px | 🧩 Puzzle |
| Boss (Examen) | Rojo + borde dorado | 36px | 🏆 Trophy |
| Recompensa | Dorado | 20px | ✨ Sparkles |

### Estados visuales de nodos

| Estado | Apariencia | Interacción |
|--------|------------|-------------|
| `locked` | Gris, opacidad 0.4, ícono candado | No clickable. Shake animation + vibración |
| `available` | Color completo, pulso CSS | Click → transición zoom → Lección/Quiz |
| `in_progress` | Color completo, borde blanco 3px, brillo | Click → continuar |
| `completed` | Color sólido, check blanco interior | Click → resumen con score y fecha |

---

## 8. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Mobile: 320px – 767px | Vertical, 1 columna, scroll, touch targets 44×44px |
| Tablet: 768px – 1023px | Híbrido, sidebar colapsable |
| Desktop: 1024px+ | Multi-panel, sidebar fija, zoom/pan en roadmap |

---

## 9. Hover / Interacciones — Regla General

TODO elemento interactivo debe tener:
1. `transition: all 0.2s ease`
2. `cursor: pointer`
3. En hover:
   - `translateY(-2px)` o `(-3px)` para más énfasis
   - `border-color` se aclara (color de acento del contexto)
   - `box-shadow: 0 8px 30px rgba(0,0,0,0.3)`
   - `background` se aclara (`var(--surface-2)`)

---

## 10. Prohibiciones de Diseño

- ❌ `backdrop-filter: blur()` — causa glows/artefactos
- ❌ Clase `.card` global — trae glass effects heredados
- ❌ `box-shadow: var(--shadow-emerald)` / `var(--shadow-glow)` — glows verdes/azules
- ❌ Fondos semitransparentes `rgba(255,255,255,0.01)` — sin relleno visible
- ✅ `var(--surface)` (#151518) para fondos sólidos de cards
- ✅ `var(--surface-2)` (#1C1C22) para hover states
- ✅ `::before` con gradiente overlay en cada card
