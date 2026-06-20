# EduApp — Estado Actual y Deuda Técnica

> Última actualización: 20/06/2026. Documento vivo — actualizar al implementar features.

---

## 1. Estado general

| Área | Estado | Detalle |
|------|--------|---------|
| **Frontend** | ✅ Funcional | 20/20 páginas implementadas y navegables |
| **Backend (Edge Functions)** | ✅ Funcional | 15/15 funciones desplegadas y operativas |
| **Base de datos** | ✅ Funcional | 4 migraciones aplicadas, RLS activo |
| **IA (LLM)** | ✅ Funcional | NVIDIA Kimi K2.6 operativo para chat, lecciones, quizzes, roadmaps |
| **IA (Embeddings)** | ✅ Funcional | Gemini embedding-001 para RAG vectorial |
| **Autenticación** | ✅ Funcional | Login, registro, roles (student/teacher/parent) |
| **Gamificación** | ⚠️ Parcial | Medallas y XP existen, sin ceremonia ni evolución real |
| **Accesibilidad** | ⚠️ Parcial | WCAG 2.1 AA parcial, sin navegación por voz |
| **Testing** | ❌ Ausente | Sin tests unitarios ni de integración |
| **CI/CD** | ❌ Ausente | Sin pipeline automatizado |
| **Documentación** | ✅ Completa | DESIGN, ARCHITECTURE, SPEC, DEMO, AGENTS |

---

## 2. Inventario de implementación

### 2.1 Páginas (`src/pages/`)

| Página | Estado | Notas |
|--------|--------|-------|
| Login | ✅ Completo | Magic link, OAuth decorativo (sin handler) |
| Register | ✅ Completo | Wizard 3 pasos, OTP simulado |
| ForgotPassword | ✅ Completo | Conectado a Supabase Auth |
| OnboardingAccess | ✅ Completo | 5 toggles de accesibilidad |
| OnboardingAvatar | ✅ Completo | 3 mascotas, nombre personalizable |
| Dashboard | ✅ Completo | Saludo dinámico, cursos, sidebar con mascota |
| Explore | ✅ Completo | Catálogo público, inscripción por código |
| Roadmap | ✅ Completo | SVG serpiente, estados de nodos, mascota guía |
| Lesson | ✅ Completo | Typewriter, chat IA, progreso de lectura |
| Quiz | ✅ Completo | Timer, 4 opciones, IA genera preguntas |
| QuizResult | ✅ Completo | Score ring, pass/fail, vibración |
| Coliseo | ⚠️ Parcial | Estructura completa, pero 5 preguntas hardcoded (no IA) |
| Achievements | ✅ Completo | Grid de medallas, rareza, estados locked/unlocked |
| Review | ✅ Completo | Análisis de errores, hub de refuerzo |
| TeacherDashboard | ✅ Completo | Cursos, stats, creación vía modal |
| RoadmapDesigner | ✅ Completo | Editor visual, chat IA para modificaciones |
| ContentReview | ✅ Completo | Cola de revisión, aprobar/rechazar/regenerar |
| ParentDashboard | ✅ Completo | Estudiantes vinculados, gráficos, vinculación |
| Profile | ✅ Completo | Avatar, credenciales, datos por rol |
| Settings | ✅ Completo | Preferencias, accesibilidad (5 toggles) |

### 2.2 Edge Functions (`supabase/functions/`)

| Función | Estado | Streaming | RAG | Guarda en DB |
|---------|--------|-----------|-----|--------------|
| `chat` | ✅ | Sí | Sí | No |
| `chat-roadmap` | ✅ | No | No | No |
| `analyze-error` | ✅ | No | No | No |
| `generate-roadmap` | ✅ | No | No | Sí (nodes) |
| `generate-lesson` | ✅ | Sí | Sí | Sí (nodes) |
| `generate-quiz` | ✅ | No | Sí | Sí (nodes) |
| `generate-test` | ✅ | No | No | No |
| `generate-coliseo` | ✅ | No | No | No |
| `generate-course-content` | ✅ | No | No | Sí (nodes) |
| `generate-medal-svg` | ✅ | No | No | Sí (medals) |
| `reinforce` | ✅ | Sí | Sí | No |
| `register-user` | ✅ | No | No | Sí (auth+profiles) |
| `upload-source` | ✅ | No | No | Sí (source_files) |
| `embed-source` | ✅ | No | Sí | Sí (documents) |
| `youtube-transcript` | ✅ | No | No | No |

### 2.3 Componentes (`src/components/`)

| Componente | Estado | Usado por |
|------------|--------|-----------|
| Header | ✅ | Dashboard, Explore, Teacher, Parent, ContentReview, RoadmapDesigner |
| Mascot | ✅ | Dashboard, Roadmap, Quiz, Review, Coliseo, OnboardingAvatar |
| PageWrapper | ✅ | Todas las 20 páginas |
| StarsBackground | ✅ | App.jsx (global) |
| CourseCreateModal | ✅ | TeacherDashboard |
| CourseDetailModal | ✅ | TeacherDashboard |

### 2.4 Librerías (`src/lib/`)

| Archivo | Estado | Propósito |
|---------|--------|-----------|
| supabase.js | ✅ | Cliente Supabase, helpers de sesión |
| api.js | ✅ | ~40 funciones CRUD |
| llm.js | ✅ | Wrappers de Edge Functions |
| gemini.js | ✅ | Llamadas directas NVIDIA (fallback, nombre engañoso) |
| streaming.js | ✅ | Helpers SSE |
| sanitize.js | ✅ | DOMPurify para contenido IA |
| ai-client.js | ✅ | Proxy al ai-backend Express |

---

## 3. Deuda técnica

### 3.1 Seguridad

| # | Problema | Severidad | Archivo | Descripción |
|---|----------|-----------|---------|-------------|
| S1 | Contraseña en texto plano en profiles | 🔴 Alta | `supabase/functions/register-user/index.ts:84` | Campo `password` guardado como texto plano. Marcado como "DEMO ONLY" pero sin migración para removerlo |
| S2 | `.env.example` no lista `NVIDIA_API_KEY` | 🟡 Media | `.env.example` | La variable más crítica del sistema no está documentada en el template |
| S3 | `VITE_NVIDIA_API_KEY` en frontend | 🟡 Media | `src/lib/gemini.js` | API key del LLM expuesta al browser. Aunque es una key de NVIDIA (no tiene permisos de escritura), es mala práctica |
| S4 | Sin rate limiting en Edge Functions | 🟡 Media | Todas las funciones | No hay protección contra abuso. Dependiente del rate limiting de Supabase |
| S5 | OAuth decorativo | 🟢 Baja | `src/pages/Login.jsx` | Botón "Continuar con Google" sin handler. Puede confundir usuarios |

### 3.2 Código duplicado

| # | Duplicación | Archivos | Descripción |
|---|-------------|----------|-------------|
| D1 | `generate-test` ≈ `generate-coliseo` | `supabase/functions/generate-test/index.ts`, `generate-coliseo/index.ts` | 66 líneas casi idénticas. Solo cambia difficulty level (4 vs 5) y wording del prompt |
| D2 | `jsonOk()` / `jsonError()` repetidos | Todas las Edge Functions | Cada función redefine estos helpers. Deberían estar en `_shared/` |
| D3 | Prompts inline en `generate-course-content` | `supabase/functions/generate-course-content/index.ts` | System prompts definidos inline en vez de usar `_shared/prompts/` como el resto |

### 3.3 Configuración inconsistente

| # | Inconsistencia | Descripción |
|---|----------------|-------------|
| C1 | `GEMINI_API_KEY` vs `NVIDIA_API_KEY` | `.env.example` documenta Gemini pero no NVIDIA. El LLM real es NVIDIA |
| C2 | `VITE_GEMINI_API_KEY` sin uso | Definido en `.env.example` pero no referenciado en código activo |
| C3 | `GROQ_API_KEY` sin uso | listed como "optional" pero nunca se usa |
| C4 | Contraseña demo en `profiles.password` | Campo existe en la tabla (migración) y se muestra en Profile.jsx. Debería ser solo para demo, no en producción |

### 3.4 Features incompletas (vs SPEC)

Ver `docs/ARCHITECTURE.md` §7 para el roadmap completo. Resumen:

| Prioridad | Feature | RF |
|-----------|---------|-----|
| 🔴 Alta | Pantalla UnitTest (no existe route) | RF-18 |
| 🔴 Alta | Coliseo con IA (preguntas hardcoded) | RF-19 |
| 🔴 Alta | Navegación por voz (sin Web Speech API) | RF-25 |
| 🔴 Alta | Anti-cheating (sin visibilityState check) | RF-18 |
| 🟡 Media | Confetti animations (sin implementación) | — |
| 🟡 Media | Ceremonia de medallas (sin modal) | RF-22 |
| 🟡 Media | Aceptación vínculo padre (sin UI estudiante) | RF-29 |
| 🟡 Media | "Retos del día" hardcodeados | RF-09 |
| 🟢 Baja | Reportes PDF (sin librería) | RF-30 |
| 🟢 Baja | Detalle estudiante padre (sin route) | RF-30 |
| 🟢 Baja | OAuth real (botón decorativo) | RF-01 |
| 🟢 Baja | Notificaciones real-time (sin Realtime) | RF-31 |
| 🟢 Baja | Emails de reportes (sin infraestructura) | RF-31 |
| 🟢 Baja | Evolución de mascotas (sin mecánica) | RF-24 |
| 🟢 Baja | Refactorización cognitiva (sin lógica) | RF-27 |
| 🟢 Baja | Palabras interactivas (sin click handler) | RF-14 |

### 3.5 Testing y infraestructura

| # | Ausencia | Descripción |
|---|----------|-------------|
| T1 | Sin tests unitarios | Ningún archivo `*.test.js` o `*.spec.js` en el proyecto |
| T2 | Sin tests de integración | Los scripts en `scripts/` son manuales, no automatizados |
| T3 | Sin CI/CD | No hay GitHub Actions, no hay pipeline de build/test/deploy |
| T4 | Sin linter configurado | `eslint.config.js` existe pero no se ejecuta en pre-commit |
| T5 | Sin Type checking | Proyecto es JS puro, sin JSDoc ni validación de tipos |
| T6 | Sin monitoreo | Sin Sentry, sin logs estructurados, sin métricas de performance |

### 3.6 Rendimiento y UX

| # | Problema | Descripción |
|---|----------|-------------|
| P1 | Coliseo: preguntas hardcoded | Solo 5 preguntas de biología. Un estudiante de matemáticas vería contenido irrelevante |
| P2 | Dashboard: "Retos del día" hardcodeados | Array estático en el componente, no se genera dinámicamente |
| P3 | Roadmap: sin pan/zoom en desktop | Solo scroll vertical. El SPEC pide pan con mouse drag y zoom con scroll wheel |
| P4 | Lesson: sin variación de velocidad para key concepts | Todo se revela a 20ms/carácter. El SPEC pide 40ms para conceptos clave |
| P5 | Quiz: sin True/False ni matching | Solo opción múltiple implementada |
| P6 | Achievements: sin filtros ni stats bar | Grid sin filtrar, sin barra de estadísticas superior |

---

## 4. Deuda técnica por prioridad

### 🔴 Alta (resolver antes de producción)

1. **S1** — Remover campo `password` en texto plano de `profiles` (o cifrar)
2. **C1/C2** — Actualizar `.env.example` con `NVIDIA_API_KEY` y remover variables sin uso
3. **D1** — Unificar `generate-test` y `generate-coliseo` en una función parametrizada
4. **D2** — Extraer `jsonOk()`/`jsonError()` a `_shared/http.ts`
5. **T1** — Agregar tests mínimos para las Edge Functions críticas (chat, generate-roadmap, embed-source)

### 🟡 Media (resolver antes de escalar)

6. **S4** — Implementar rate limiting básico en Edge Functions
7. **D3** — Mover prompts inline de `generate-course-content` a `_shared/prompts/`
8. **C4** — Decidir si el campo `password` en profiles es solo demo o se remueve
9. **T3** — Configurar CI básico (lint + build en push)
10. **P1** — Conectar Coliseo a generación IA (prioridad funcional alta)

### 🟢 Baja (resolver cuando haya tiempo)

11. **S5** — Remover o implementar botón OAuth
12. **T2** — Agregar tests E2E automatizados
13. **T4** — Configurar pre-commit hook con ESLint
14. **P2-P6** — Completar features del SPEC según roadmap

---

## 5. Métricas del proyecto

| Métrica | Valor |
|---------|-------|
| Archivos JSX | 20 páginas + 6 componentes = 26 |
| Archivos CSS | 16 (uno por página, compartidos entre componentes) |
| Edge Functions | 15 |
| Líneas de código frontend (estimado) | ~8,000-10,000 |
| Líneas de código Edge Functions (estimado) | ~2,000 |
| Migraciones SQL | 4 |
| Tablas en BD | 11 (profiles, courses, nodes, enrollments, progress, source_files, documents, weaknesses, medals, notifications, parent_links) |
| Scripts de testing | 8 (manuales) |
| Skills de IA instaladas | 8 + 2 personalizadas |
| Requerimientos funcionales (SPEC) | 31 |
| RF completamente implementados | 13 (42%) |
| RF parcialmente implementados | 14 (45%) |
| RF no implementados | 4 (13%) |

---

## 6. Próximos pasos recomendados

1. **Inmediato (esta semana):** Actualizar `.env.example`, extraer helpers compartidos, unificar generate-test/generate-coliseo
2. **Corto plazo (2 semanas):** Tests básicos para Edge Functions, CI mínimo, Coliseo con IA
3. **Mediano plazo (1 mes):** Navegación por voz, UnitTest page, confetti/ceremonias
4. **Largo plazo (2+ meses):** OAuth real, notificaciones real-time, PDF reports, feature completa del SPEC
