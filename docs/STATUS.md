# EduApp — Estado Actual y Deuda Técnica

> Última actualización: 02/07/2026. Documento vivo — actualizar al implementar features.

---

## 1. Estado general

| Área | Estado | Detalle |
|------|--------|---------|
| **Frontend** | ✅ Funcional | 20/20 páginas implementadas y navegables |
| **Backend (Edge Functions)** | ✅ Funcional | 15/15 funciones desplegadas y operativas |
| **Base de datos** | ✅ Funcional | 13 migraciones aplicadas, RLS activo |
| **IA (LLM)** | ✅ Funcional | NVIDIA Kimi K2.6 operativo para chat, lecciones, quizzes, roadmaps |
| **IA (Embeddings)** | ✅ Funcional | Gemini embedding-001 para RAG vectorial |
| **Autenticación** | ✅ Funcional | Login, registro, roles (student/teacher/parent) |
| **Gamificación** | ⚠️ Parcial | Medallas y XP existen, sin ceremonia ni evolución real |
| **Accesibilidad** | ✅ Funcional | WCAG 2.1 AA parcial, **navegación por voz implementada** (Groq Whisper + LLaMA) |
| **Testing** | ⚠️ Parcial | 20+ scripts manuales, sin tests unitarios automatizados |
| **CI/CD** | ⚠️ Parcial | Configuración Vercel + Render, sin pipeline automatizado |
| **Documentación** | ✅ Completa | DESIGN, ARCHITECTURE, SPEC, DEMO, AGENTS, STATUS |
| **Despliegue** | ✅ Listo | vercel.json (frontend) + render.yaml (ai-backend) |

---

## 2. Inventario de implementación

### 2.1 Páginas (`src/pages/`)

| Página | Estado | Notas |
|--------|--------|-------|
| Login | ✅ Completo | Magic link, OAuth decorativo (sin handler) |
| Register | ✅ Completo | Wizard 3 pasos, OTP simulado |
| ForgotPassword | ✅ Completo | Conectado a Supabase Auth |
| OnboardingAccess | ✅ Completo | 5 toggles de accesibilidad, **incluye toggle de voz** |
| OnboardingAvatar | ✅ Completo | 3 mascotas, nombre personalizable |
| Dashboard | ✅ Completo | Saludo dinámico, cursos, sidebar con mascota, **retos dinámicos** |
| Explore | ✅ Completo | Catálogo público, inscripción por código |
| Roadmap | ✅ Completo | SVG serpiente, estados de nodos, **colores por tipo de nodo**, barra de progreso |
| Lesson | ✅ Completo | Typewriter, chat IA, progreso de lectura, **navegación por bloques** |
| Quiz | ✅ Completo | Timer, 4 opciones, IA genera preguntas, **voz para responder** |
| QuizResult | ✅ Completo | Score ring, pass/fail, vibración, **acciones por voz** |
| Coliseo | ✅ Completo | **10 preguntas dinámicas por IA** (no más hardcoded), 3 vidas, 30 min |
| Achievements | ✅ Completo | Grid de medallas, rareza, **18 logros en catálogo** |
| Review | ✅ Completo | Análisis de errores, hub de refuerzo, **voz para navegación** |
| TeacherDashboard | ✅ Completo | Cursos, stats, creación vía modal |
| RoadmapDesigner | ✅ Completo | Editor visual, chat IA para modificaciones |
| ContentReview | ✅ Completo | Cola de revisión, aprobar/rechazar/regenerar |
| ParentDashboard | ✅ Completo | Estudiantes vinculados por DNI, gráficos, **notificaciones en tiempo real** |
| Profile | ✅ Completo | Avatar, credenciales, datos por rol |
| Settings | ✅ Completo | Preferencias, accesibilidad (5 toggles), **toggle de voz y notificaciones** |

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
| **VoiceIndicator** | ✅ | **App.jsx (global) — indicador visual de voz** |

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
| **voice.js** | ✅ | **VAD, STT (Groq Whisper), TTS (Web Speech API), 222 líneas** |
| **voice-commands.js** | ✅ | **27 comandos de voz en 9 categorías, 70+ ejemplos español** |
| **notifications.js** | ✅ | **13 funciones de notificación, RPC security definer** |
| **achievements.js** | ✅ | **Catálogo de 18 logros, evaluación de reglas, otorgamiento automático** |
| **markdown.js** | ✅ | **Renderizado markdown para respuestas del tutor IA** |
| **understanding.js** | ✅ | **Fórmula de cálculo de entendimiento: S = (P*0.50) + (Nc*0.25) + (Er*0.15) + (Te*0.10)** |

### 2.5 Context (`src/context/`)

| Archivo | Estado | Propósito |
|---------|--------|-----------|
| AuthContext.jsx | ✅ | Estado global de autenticación |
| **VoiceContext.jsx** | ✅ | **Estado global de voz, 355 líneas, orquestador de comandos** |

### 2.6 Datos (`src/data/`)

| Archivo | Estado | Propósito |
|---------|--------|-----------|
| **achievements.json** | ✅ | **Catálogo de 18 logros (12 mastery + 6 behavior)** |

### 2.7 Migraciones SQL (`supabase/migrations/`)

| Migración | Propósito |
|-----------|-----------|
| `20260602200820_init.sql` | Tablas iniciales, esquema base |
| `20260602200821_rag_vector.sql` | pgvector, función match_documents |
| `20260602200822_functions.sql` | Funciones SQL auxiliares |
| `20260602200823_seed_demo.sql` | Datos de demo |
| `20260602200824_onboarding_completed.sql` | Flag de onboarding completado |
| `20260602200825_enrollment_teacher_rls.sql` | RLS de docentes para inscripciones |
| `20260602200826_enrollment_tracking.sql` | Tracking de inscripciones |
| `20260602200827_notifications_insert.sql` | Política RLS de inserción de notificaciones |
| `20260602200828_one_parent_per_student.sql` | Índice único padre-estudiante |
| `20260602200829_check_student_parent.sql` | RPC para verificar relación padre-estudiante |
| `20260602200830_fix_notification_types.sql` | CHECK constraint expandido (14 tipos) |
| `20260602200831_insert_notification_rpc.sql` | RPC SECURITY DEFINER para notificaciones |
| `20260602200832_medals_insert_self.sql` | Política RLS para auto-inserción de medallas |

---

## 3. Deuda técnica

### 3.1 Seguridad

| # | Problema | Severidad | Archivo | Descripción |
|---|----------|-----------|---------|-------------|
| S1 | Contraseña en texto plano en profiles | 🔴 Alta | `supabase/functions/register-user/index.ts:84` | Campo `password` guardado como texto plano. Marcado como "DEMO ONLY" pero sin migración para removerlo |
| S2 | `VITE_NVIDIA_API_KEY` en frontend | 🟡 Media | `src/lib/gemini.js` | API key del LLM expuesta al browser. Aunque es una key de NVIDIA (no tiene permisos de escritura), es mala práctica |
| S3 | Sin rate limiting en Edge Functions | 🟡 Media | Todas las funciones | No hay protección contra abuso. Dependiente del rate limiting de Supabase |
| S4 | OAuth decorativo | 🟢 Baja | `src/pages/Login.jsx` | Botón "Continuar con Google" sin handler. Puede confundir usuarios |

### 3.2 Código duplicado

| # | Duplicación | Archivos | Descripción |
|---|-------------|----------|-------------|
| D1 | `generate-test` ≈ `generate-coliseo` | `supabase/functions/generate-test/index.ts`, `generate-coliseo/index.ts` | 66 líneas casi idénticas. Solo cambia difficulty level (4 vs 5) y wording del prompt |
| D2 | `jsonOk()` / `jsonError()` repetidos | Todas las Edge Functions | Cada función redefine estos helpers. Deberían estar en `_shared/` |
| D3 | Prompts inline en `generate-course-content` | `supabase/functions/generate-course-content/index.ts` | System prompts definidos inline en vez de usar `_shared/prompts/` como el resto |

### 3.3 Features incompletas (vs SPEC)

Ver `docs/ARCHITECTURE.md` §7 para el roadmap completo. Resumen:

| Prioridad | Feature | RF | Estado |
|-----------|---------|-----|--------|
| 🔴 Alta | Pantalla UnitTest | RF-18 | No existe route `/test` |
| 🟡 Media | Confetti animations | — | Sin implementación |
| 🟡 Media | Ceremonia de medallas | RF-22 | Medallas aparecen sin modal fullscreen |
| 🟡 Media | Aceptación vínculo padre (UI estudiante) | RF-29 | Notificación existe pero sin UI de aceptación |
| 🟡 Media | "Retos del día" dinámicos | RF-09 | Implementado con datos reales (no hardcoded) |
| 🟢 Baja | Reportes PDF | RF-30 | Sin librería PDF |
| 🟢 Baja | Detalle estudiante padre | RF-30 | No existe route `/parent/students/:id` |
| 🟢 Baja | OAuth real | RF-01 | Botón decorativo |
| 🟢 Baja | Notificaciones real-time | RF-31 | ✅ **Implementado** — Supabase Realtime en Header |
| 🟢 Baja | Evolución de mascotas | RF-24 | Sin mecánica real |
| 🟢 Baja | Refactorización cognitiva | RF-27 | Sin lógica |
| 🟢 Baja | Palabras interactivas | RF-14 | Solo CSS punteado, sin click handler |

### 3.4 Testing y infraestructura

| # | Estado | Descripción |
|---|--------|-------------|
| T1 | ⚠️ Parcial | 20+ scripts manuales en `scripts/`, sin tests unitarios automatizados |
| T2 | ⚠️ Parcial | Scripts de test E2E existen pero no son automatizados |
| T3 | ⚠️ Parcial | Configuración Vercel + Render, sin GitHub Actions |
| T4 | ❌ Ausente | Sin pre-commit hook con ESLint |
| T5 | ❌ Ausente | Sin Type checking (JS puro, sin JSDoc) |
| T6 | ❌ Ausente | Sin monitoreo (Sentry, logs estructurados) |

### 3.5 Notificaciones (funcionalidad implementada)

| # | Aspecto | Estado | Descripción |
|---|---------|--------|-------------|
| N1 | Tabla + RLS | ✅ | 14 tipos, 3 políticas RLS, RPC security definer |
| N2 | Realtime | ✅ | Suscripción INSERT/UPDATE/DELETE en Header |
| N3 | UI | ✅ | Campana con badge, dropdown, marcar leído |
| N4 | Estudiante | ✅ | Activo: medalla, progreso, quiz, inscripción, coliseo |
| N5 | Docente | ⚠️ | `notifyTeacherNewStudent` activo. `notifyTeacherProgress` e `notifyTeacherInactivity` definidos pero sin llamadores |
| N6 | Padre | ⚠️ | `notifyParentProgress` y `notifyParentMedal` definidos pero sin llamadores |
| N7 | TTL/Limpieza | ❌ | Sin mecanismo de expiración ni eliminación |

### 3.6 Voz (funcionalidad implementada)

| # | Aspecto | Estado | Descripción |
|---|---------|--------|-------------|
| V1 | Audio + VAD | ✅ | Detección de actividad por voz (RMS threshold), grabación webm/opus |
| V2 | STT | ✅ | Groq Whisper large-v3, idioma español |
| V3 | Clasificación | ✅ | Groq LLaMA 3.3 70B, 9 categorías, 27 acciones |
| V4 | TTS | ✅ | Web Speech API, es-ES, configurable |
| V5 | Navegación | ✅ | 6 rutas directas + fuzzy matching de cursos + resolución de último nodo |
| V6 | Quiz por voz | ✅ | Selección A/B/C/D, lectura de preguntas/opciones |
| V7 | Lección por voz | ✅ | Completar nodo, abrir/cerrar chat |
| V8 | Sistema | ✅ | Leer pantalla, repetir, ayuda, notificaciones, logros |
| V9 | Tutor IA | ✅ | Preguntas libres respondidas por NVIDIA/Kimi |
| V10 | Visual | ✅ | Indicador animado con nivel de audio, feedback toast |
| V11 | Accesibilidad | ✅ | ARIA live regions, role="status", anuncios screen reader |
| V12 | Persistencia | ✅ | localStorage + Supabase profile sync |
| V13 | Páginas integradas | ⚠️ | 9 de 20 páginas (solo páginas de estudiante) |

---

## 4. Deuda técnica por prioridad

### 🔴 Alta (resolver antes de producción)

1. **S1** — Remover campo `password` en texto plano de `profiles` (o cifrar)
2. **D1** — Unificar `generate-test` y `generate-coliseo` en una función parametrizada
3. **D2** — Extraer `jsonOk()`/`jsonError()` a `_shared/http.ts`
4. **T1** — Agregar tests mínimos para las Edge Functions críticas (chat, generate-roadmap, embed-source)

### 🟡 Media (resolver antes de escalar)

5. **S3** — Implementar rate limiting básico en Edge Functions
6. **D3** — Mover prompts inline de `generate-course-content` a `_shared/prompts/`
7. **T3** — Configurar CI básico (lint + build en push)
8. **N5/N6** — Conectar funciones de notificación para docente/padre (notifyTeacherProgress, notifyParentMedal, etc.)
9. **N7** — Implementar TTL o limpieza de notificaciones antiguas

### 🟢 Baja (resolver cuando haya tiempo)

10. **S4** — Remover o implementar botón OAuth
11. **T2** — Agregar tests E2E automatizados
12. **T4** — Configurar pre-commit hook con ESLint
13. **Features del SPEC** — Completar según roadmap (confetti, ceremonia medallas, PDF reports, etc.)

---

## 5. Métricas del proyecto

| Métrica | Valor |
|---------|-------|
| Archivos JSX | 20 páginas + 7 componentes = 27 |
| Archivos CSS | 16 (uno por página compartidos entre componentes) |
| Edge Functions | 15 |
| Contexts | 2 (AuthContext, VoiceContext) |
| Librerías frontend | 13 (supabase, api, llm, gemini, streaming, sanitize, ai-client, voice, voice-commands, notifications, achievements, markdown, understanding) |
| Datos estáticos | 1 (achievements.json) |
| Migraciones SQL | 13 |
| Tablas en BD | 11 (profiles, courses, nodes, enrollments, progress, source_files, documents, weaknesses, medals, notifications, parent_links) |
| Scripts de testing | 20+ (manuales) |
| Skills de IA instaladas | 10 + 2 personalizadas |
| Requerimientos funcionales (SPEC) | 31 |
| RF completamente implementados | 14 (45%) |
| RF parcialmente implementados | 13 (42%) |
| RF no implementados | 4 (13%) |
| Nuevas dependencias | `marked` (^18.0.5) para renderizado markdown |
| Configuración despliegue | vercel.json (frontend), render.yaml (ai-backend) |

---

## 6. Próximos pasos recomendados

1. **Inmediato (esta semana):** Extraer helpers compartidos (`jsonOk/jsonError`), unificar generate-test/generate-coliseo
2. **Corto plazo (2 semanas):** Tests básicos para Edge Functions, CI mínimo, conectar notificaciones para docente/padre
3. **Mediano plazo (1 mes):** Pantalla UnitTest, confetti/ceremonias, TTL notificaciones
4. **Largo plazo (2+ meses):** OAuth real, reportes PDF, evolución de mascotas, feature completa del SPEC
