# AGENTS.md — Guía para modelos de IA

> Este archivo es el punto de entrada principal para cualquier modelo de IA que trabaje en EduApp.
> Lee `docs/ARCHITECTURE.md` para detalles técnicos profundos.

---

## 1. Qué es EduApp

Plataforma educativa web con inteligencia artificial, gamificación y accesibilidad WCAG 2.1 AA.
Permite a docentes crear cursos con roadmaps generados por IA, y a estudiantes aprender con un tutor inteligente.

**Público objetivo:** Estudiantes y docentes de Latinoamérica.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 (JavaScript, NO TypeScript) |
| Routing | react-router-dom 7 |
| Animaciones | framer-motion 12 |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| LLM (texto) | **NVIDIA AI → `moonshotai/kimi-k2.6`** (NO Gemini para chat) |
| Embeddings | Google Gemini → `gemini-embedding-001` (768 dims, solo para vectores RAG) |
| CSS | Archivos CSS por componente (sin Tailwind, sin CSS-in-JS) |

> **ATENCIÓN:** El archivo `src/lib/gemini.js` tiene nombre engañoso. Internamente usa NVIDIA/Kimi, no Gemini.

---

## 3. Estructura del proyecto

```
src/
├── components/     # Header, Mascot, PageWrapper, StarsBackground, CourseCreateModal, CourseDetailModal
├── context/        # AuthContext (estado global de auth)
├── lib/            # supabase.js, api.js, llm.js, gemini.js, streaming.js, sanitize.js, ai-client.js
├── pages/          # 20 páginas (una por feature)
│   ├── Login.jsx + Login.css
│   ├── Register.jsx + Register.css
│   ├── Dashboard.jsx + Dashboard.css
│   ├── Roadmap.jsx + Roadmap.css
│   ├── Lesson.jsx + Lesson.css
│   ├── Quiz.jsx + Quiz.css
│   ├── QuizResult.jsx + QuizResult.css
│   ├── Coliseo.jsx + Coliseo.css
│   ├── Achievements.jsx + Achievements.css
│   ├── Review.jsx + Review.css
│   ├── Explore.jsx + Explore.css
│   ├── TeacherDashboard.jsx + TeacherDashboard.css
│   ├── RoadmapDesigner.jsx + RoadmapDesigner.css
│   ├── ContentReview.jsx + ContentReview.css
│   ├── ParentDashboard.jsx + ParentDashboard.css
│   ├── Profile.jsx + Profile.css
│   ├── Settings.jsx + Settings.css
│   ├── OnboardingAccess.jsx + OnboardingAccess.css
│   ├── OnboardingAvatar.jsx + OnboardingAvatar.css
│   └── ForgotPassword.jsx + ForgotPassword.css
├── utils/          # sounds.js, vibration.js
├── App.jsx         # Router principal (HashRouter)
└── index.css       # Estilos globales

supabase/
├── functions/      # 15 Edge Functions (Deno/TypeScript)
│   ├── _shared/    # llm.ts, embeddings.ts, supabase-admin.ts, cors.ts, chunker.ts, extractors/, prompts/
│   └── [funcion]/index.ts
├── migrations/     # 4 migraciones SQL
└── config.toml

ai-backend/         # Express.js auxiliar (server.js)
scripts/            # Scripts de testing (.mjs)
docs/               # Documentación del proyecto
```

---

## 4. Documentación disponible

| Archivo | Contenido | Cuándo leerlo |
|---------|-----------|---------------|
| `docs/DESIGN.md` | **Sistema de diseño UI** — colores, cards, botones, inputs, prohibiciones | **SIEMPRE** antes de escribir CSS o crear componentes UI |
| `docs/ARCHITECTURE.md` | Arquitectura técnica, stack real, Edge Functions, modelo de datos, roadmap futuro | Cuando necesites entender el sistema completo o agregar funcionalidad |
| `docs/SPEC.md` | Requerimientos funcionales (31 RF), casos de uso, pantallas | Cuando necesites saber QUÉ debe hacer una feature |
| `docs/DEMO.md` | Cuentas de prueba, scripts, estructura de tablas clave | Cuando necesites probar o crear datos de demo |
| `docs/STATUS.md` | **Estado actual y deuda técnica** — inventario, bugs, deuda técnica, prioridades | Cuando necesites saber qué está implementado, qué falta, o qué tiene deuda técnica |

---

## 5. Convenciones de código

### 5.1 Archivos
- **Componentes:** PascalCase (`TeacherDashboard.jsx`)
- **Estilos:** Mismo nombre que el componente (`TeacherDashboard.css`)
- **Lib/utilidades:** camelCase (`supabase.js`, `sounds.js`)
- **Edge Functions:** kebab-case (`generate-lesson/`, `analyze-error/`)

### 5.2 JavaScript
- **NO TypeScript** — todo es JavaScript (JSX)
- **Functional components** con hooks (sin class components)
- **Imports:** Named imports de librerías (`import { useState } from 'react'`)
- **Supabase:** Siempre pasar por `src/lib/supabase.js` para queries
- **Edge Functions:** Llamar desde `src/lib/llm.js` o `src/lib/streaming.js`

### 5.3 CSS
- **Un archivo CSS por componente** (junto al JSX)
- **Clases BEM-like** pero sin estricto BEM (`.card-main`, `.btn-primary`, `.input-field`)
- **Variables CSS** definidas en `index.css` (paleta de colores, radios, transiciones)
- **Responsive:** Mobile-first con breakpoints en `index.css`

### 5.4 Edge Functions (Deno/TypeScript)
- Cada función en su carpeta con `index.ts`
- Usar utilidades de `_shared/` (no duplicar código)
- Siempre manejar CORS con `_shared/cors.ts`
- Siempre autenticar con `getUserClient().auth.getUser(token)`
- LLM: usar `callLlm()` de `_shared/llm.ts`
- Embeddings: usar `embedQuery()` / `embedTexts()` de `_shared/embeddings.ts`

---

## 6. Reglas para generar código

### 6.1 ANTES de escribir CSS
1. **Leer `docs/DESIGN.md` COMPLETO** — es obligatorio
2. Usar los tokens de color definidos (`--primary`, `--emerald`, `--surface`, etc.)
3. Cards: siempre con `::before` gradiente según contexto (ver DESIGN.md §11)
4. **NUNCA usar:**
   - `backdrop-filter: blur()` — causa artefactos
   - Clase `.card` de `index.css` — trae glass effects heredados
   - `box-shadow: var(--shadow-emerald)` o `var(--shadow-glow)` — causan glows
   - Fondos semitransparentes `rgba(255,255,255,0.01)` — sin relleno visible
5. **SIEMPRE usar:**
   - `var(--surface)` (#151518) para fondos sólidos de cards
   - `var(--surface-2)` (#1C1C22) para hover states

### 6.2 Al crear una página nueva
1. Crear `NombrePagina.jsx` en `src/pages/`
2. Crear `NombrePagina.css` en `src/pages/`
3. Importar en `src/App.jsx` y agregar route
4. Usar `<PageWrapper>` como contenedor (transiciones framer-motion)
5. Usar `<Header>` si la página necesita navegación
6. Seguir la estructura de páginas existentes

### 6.3 Al crear/modificar una Edge Function
1. Seguir el patrón de las funciones existentes en `supabase/functions/`
2. Usar `_shared/cors.ts` para CORS
3. Usar `_shared/supabase-admin.ts` para acceso a BD
4. Usar `_shared/llm.ts` para llamadas al LLM
5. Usar `_shared/prompts/` para system prompts
6. Manejar errores con `jsonError()` y `jsonOk()`

### 6.4 Al modificar estilos existentes
1. Buscar primero en el CSS del componente afectado
2. Si es un estilo global, buscar en `index.css`
3. No romper la paleta de colores定义da en DESIGN.md
4. Mantener consistencia con los patrones de hover/interacción (DESIGN.md §9)

---

## 7. Skills disponibles

### Skills del proyecto (`.agents/`)

| Skill | Cuándo usarla |
|-------|---------------|
| `roadmap-generation` | Cuando generes o edites roadmaps de aprendizaje |
| `roadmap-regulation` | Cuando valides la estructura de nodos (theory/quiz/boss) |

### Skills instaladas (`.agents/skills/`)

| Skill | Cuándo usarla |
|-------|---------------|
| `frontend-design` | Cuando crees componentes UI de alta calidad |
| `accessibility` | Cuando hagas auditoría WCAG o mejores accesibilidad |
| `react-best-practices` | Cuando optimices rendimiento React |
| `vite` | Cuando configures Vite o su build |
| `nodejs-backend-patterns` | Cuando crees/modifiques el ai-backend Express |
| `nodejs-best-practices` | Cuando trabajes con Node.js en general |
| `composition-patterns` | Cuando refactorices componentes React complejos |

---

## 8. Cuentas de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Estudiante | `default_student@eduapp.test` | `student123` |
| Docente | `default_teacher@eduapp.test` | `teacher123` |
| Padre | `default_parent@eduapp.test` | `parent123` |

Ver `docs/DEMO.md` para más detalles.

---

## 9. Comandos útiles

```bash
# Instalar dependencias
instalar.bat

# Iniciar todo (Supabase + Edge Functions + AI Backend + Vite)
iniciar.bat

# Solo Frontend
npm run dev

# Solo AI Backend
cd ai-backend && npm run dev

# Tests E2E
node scripts/test-e2e-teacher-student.mjs

# Seed de datos demo
node scripts/seed-test-users.mjs
```

---

## 10. Errores comunes a evitar

1. **Usar Gemini para chat:** El LLM es NVIDIA/Kimi, NO Gemini. Solo Gemini se usa para embeddings
2. **Usar `backdrop-filter`:** Prohibido en DESIGN.md. Causa artefactos visuales
3. **Usar la clase `.card` global:** Prohibida. Cada card tiene su propio estilo
4. **Olvidar CORS en Edge Functions:** Siempre usar `_shared/cors.ts`
5. **No autenticar en Edge Functions:** Siempre validar Bearer token
6. **Hardcoded data:** Evitar datos hardcodeados cuando sea posible, usar Supabase
7. **TypeScript:** El proyecto es JavaScript puro, NO agregar archivos `.tsx` o tipos
8. **Variables sensibles:** NUNCA agregar en commits.
