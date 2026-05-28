# EduApp — Sistema de Diseño Editorial Dark

> Basado en el diseño de Login y Register. Versión 1.0

---

## 1. Filosofía Visual

Estilo **editorial oscuro premium** con acentos esmeralda y púrpura. La interfaz evoca una revista de diseño + una plataforma de aprendizaje futurista. Contraste alto, gradientes sutiles, nada de glass effects ni fondos borrosos.

---

## 2. Tipografía

| Uso | Fuente | Pesos | Detalles |
|-----|--------|-------|----------|
| **Headings / Títulos** | `'Epilogue', sans-serif` | 700, 800, 900 | `letter-spacing: -0.02em` a `-0.03em` |
| **Body / UI general** | `'Plus Jakarta Sans', sans-serif` | 400, 500, 600, 700 | `letter-spacing: 0.01em` para botones |
| **Labels / Badges** | `'Plus Jakarta Sans', sans-serif` | 600, 700 | `text-transform: uppercase; letter-spacing: 0.04em-0.06em` |
| **Códigos / IDs** | `'SF Mono', 'Fira Code', monospace` | — | Solo para DNI, códigos, valores técnicos |

> **Font-face cargada:** `@import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap')`

---

## 3. Paleta de Color

### 3.1 Colores principales

| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | `#6C63FF` | Purple principal, hover states, iconos |
| `--primary-light` | `#8B83FF` | Texto hover, iconos activos |
| `--emerald` | `#10B981` | **Color principal de la marca**. Bordes, gradientes, indicadores activos |
| `--emerald-light` | `#34D399` | Texto activo, gradient text |
| `--emerald-dark` | `#059669` | Gradientes de botones |
| `--purple` | `#8B5CF6` | Gradientes secundarios, AI cards |
| `--accent` | `#F59E0B` | Logros, coliseo, highlights especiales |
| `--success` | `#22C55E` | Correcto, completado |
| `--error` | `#EF4444` | Error, incorrecto, peligro |
| `--warning` | `#F97316` | Advertencia |

### 3.2 Fondos

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#0A0A14` | Fondo de página (body) |
| `--bg-2` | `#0E0E1F` | Fondos secundarios (scrollbar track) |
| `--surface` | `#151518` | **Cards internas, inputs, secciones** (neutro) |
| `--surface-2` | `#1C1C22` | Hover de cards, fondos alternos (neutro) |
| `--surface-3` | `#262630` | Scrollbar thumb, progress bar bg (neutro) |

### 3.3 Bordes

| Token | Valor | Uso |
|-------|-------|-----|
| `--border-light` | `rgba(255,255,255,0.06)` | Borde por defecto en inputs y cards |
| `--border` | `rgba(16,185,129,0.15)` | Borde esmeralda sutil |

### 3.4 Texto

| Token | Valor | Uso |
|-------|-------|-----|
| `--text` | `#F0F0F5` | Texto principal |
| `--text-muted` | `#9494B8` | Texto secundario, descripciones |
| `--text-dim` | `#5E5E7A` | Texto terciario, placeholders, labels |

---

## 4. Tarjetas (Cards) — PATRÓN CRÍTICO

### 4.1 Card principal (contenedor tipo formulario)

```css
.card-main {
  background: linear-gradient(170deg, #080814, #0A0A14);
  border: none;
  border-radius: var(--radius-xl);  /* 28px */
  position: relative;
  z-index: 0;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(16,185,129,0.02) inset;
  /* outline: 1px solid rgba(10,10,20,0.5); ← opcional para antialiasing */
}

.card-main::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-xl);
  background: linear-gradient(
    135deg,
    rgba(16,185,129,0.05),
    rgba(108,99,255,0.06) 15%,
    rgba(16,185,129,0.04) 55%,
    rgba(16,185,129,0.02) 80%,
    rgba(108,99,255,0.06)
  );
  pointer-events: none;
  z-index: -1;
}

.card-main > * { position: relative; z-index: 1; }
```

**Ejemplos:** `.login-form-wrap`, `.register-wrap`, `.onboarding-wrap`

### 4.2 Card interno (contenido secundario)

```css
.card-inner {
  background: var(--surface);     /* #151518 — SÓLIDO (neutro) */
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: var(--radius-lg);  /* 20px */
  position: relative;
  overflow: hidden;
}

.card-inner::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(16,185,129,0.02), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.card-inner > * { position: relative; z-index: 1; }

.card-inner:hover {
  border-color: rgba(16,185,129,0.15);
  background: var(--surface-2);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}
```

**Ejemplos:** `.role-card`, `.challenge-card`, `.course-card`, `.sidebar-card`, `.explore-card`, `.achievement-card`, `.settings-section`, `.profile-*card`

### 4.3 Card interactivo (seleccionable como rol)

```css
.card-interactive {
  composes: card-inner;
  cursor: pointer;
  transition: var(--transition-slow);  /* all 0.4s ease */
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

---

## 5. Botones

| Clase | Fondo | Hover |
|-------|-------|-------|
| `btn-primary` | `linear-gradient(135deg, var(--primary), var(--purple))` | `translateY(-2px)`, shadow intensifica |
| `btn-emerald` | `linear-gradient(135deg, var(--emerald), var(--emerald-dark))` | Igual |
| `btn-accent` | `linear-gradient(135deg, var(--accent), var(--accent-light))` | Igual (texto oscuro) |
| `btn-ghost` | Transparente, borde `--border-light` | `var(--surface)` bg, borde `--primary` |
| `btn-danger` | `linear-gradient(135deg, var(--error), #DC2626)` | — |
| `btn-success` | `linear-gradient(135deg, var(--success), #16A34A)` | — |

**Botones sin clase:** usar `link-btn` para links estilizados como botones.

---

## 6. Inputs / Formularios

```css
.input-field {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);  /* 12px */
  padding: 12px 16px;
  color: var(--text);
  font-size: 0.95rem;
  transition: var(--transition);
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

## 7. Section Labels (encabezados de sección decorativos)

```css
.section-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(16,185,129,0.08), transparent);
}
```

---

## 8. Layout Principal

```css
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.page-content {
  flex: 1;
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}
```

---

## 9. Hover / Interacciones — REGLA GENERAL

TODOS los elementos interactivos deben tener:

1. `transition: var(--transition)` (all 0.2s ease)
2. `cursor: pointer` si es clickeable
3. En hover:
   - `translateY(-2px)` o `(-3px)` para más énfasis
   - `border-color` se aclara (usar el color de acento del contexto)
   - `box-shadow: 0 8px 30px rgba(0,0,0,0.3)` o similar
   - `background` se aclara (pasar a `var(--surface-2)` o variante con color)

---

## 10. PROHIBICIONES

- ❌ **No usar** `backdrop-filter: blur()` ni `-webkit-backdrop-filter: blur()` — causa glows/artefactos
- ❌ **No usar** la clase `.card` de `index.css` — trae glass effects heredados. Cada card debe tener su propio estilo.
- ❌ **No usar** `box-shadow: var(--shadow-emerald)` ni `var(--shadow-glow)` — causan glows verdes/azules
- ❌ **No usar** colores semi-transparentes como `rgba(255,255,255,0.01)` para fondos de cards — no tienen relleno visible
- ✅ **Usar** `var(--surface)` (#151518) para fondos sólidos de cards internas
- ✅ **Usar** `var(--surface-2)` (#1C1C22) para hover states

---

## 11. Gradiente Overlay — PATRÓN UNIVERSAL

Toda card debe tener su propio `::before` con gradiente overlay. El gradiente varía según el contexto:

| Contexto | Gradiente |
|----------|-----------|
| **Default / Esmeralda** (Dashboard, Explore, Achievements, Profile, Settings, Quiz) | `linear-gradient(135deg, rgba(16,185,129,0.02), transparent 60%)` |
| **Purple** (Lecciones, cursos) | `linear-gradient(135deg, rgba(108,99,255,0.03), transparent 60%)` |
| **Amber / Coliseo** | `linear-gradient(135deg, rgba(245,158,11,0.02), transparent 60%)` |
| **Red / Error** (Review) | `linear-gradient(135deg, rgba(239,68,68,0.02), transparent 60%)` |
| **Principal** (contenedor principal) | `linear-gradient(135deg, rgba(16,185,129,0.05), rgba(108,99,255,0.06) 15%, ...)` |

---

## 12. Responsive Breakpoints

- `@media (max-width: 900px)` — Login layout cambia a columna
- `@media (max-width: 767px)` — Móvil general
  - Padding se reduce a 16px
  - Grids pasan a 1 columna
  - `.hide-mobile { display: none !important; }`
- `@media (min-width: 768px)` — Desktop
  - `page-content { padding: 24px; }`
  - `.hide-desktop { display: none !important; }`
