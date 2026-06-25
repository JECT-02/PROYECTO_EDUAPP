# EduApp — Documentacion del Proyecto

> Documento de especificacion para cliente. Version 2.0 — 24/06/2026.
> Plataforma educativa web con inteligencia artificial, gamificacion y accesibilidad WCAG 2.1 AA.

---

## 1. Resumen Ejecutivo

EduApp es una plataforma web SPA (Single Page Application) que integra inteligencia artificial generativa, un sistema de gamificacion completo y accesibilidad multimodal para crear experiencias de aprendizaje personalizadas.

El sistema permite a docentes crear cursos subiendo material fuente (PDF, DOCX, TXT, URLs de YouTube) y genera automaticamente roadmaps de aprendizaje con lecciones, quizzes y examenes mediante IA. Los estudiantes interactuan con un tutor IA que adapta su lenguaje segun el nivel de comprension del alumno, ganan puntos de experiencia, desbloquean 18 medallas con rarezas progresivas y compiten en el Coliseo de Retos. Los padres monitorean el progreso en tiempo real mediante un panel de solo lectura.

El stack tecnologico se compone de React 19 + Vite 8 en el frontend, Supabase (Postgres, Auth, Storage, Edge Functions) como backend, y tres proveedores de IA: NVIDIA (Kimi K2.6 para generacion de texto), Groq (Whisper Large v3 para transcripcion de voz, LLaMA 3.3 70B para clasificacion) y Google (Gemini Embedding 001 para vectores de busqueda semantica RAG).

---

## 2. Stack Tecnologico

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| Frontend | React + Vite | 19.2.5 / 8.0.10 | SPA con enrutamiento cliente |
| Routing | react-router-dom | 7.15.0 | HashRouter para S3/GitHub Pages |
| Animaciones | framer-motion | 12.38.0 | Transiciones de pagina, micro-interacciones |
| Iconos | lucide-react | 1.14.0 | Iconografia vectorial tree-shakeable |
| Graficos | recharts | 3.8.1 | Analytics de panel padre/docente |
| Sanitizacion | DOMPurify | 3.4.7 | Prevencion XSS en contenido generado por IA |
| Markdown | marked | 18.0.5 | Renderizado de lecciones con GFM |
| Backend (BaaS) | Supabase | - | Auth, Postgres 17, Storage, Edge Functions, pgvector, Realtime |
| LLM texto | NVIDIA Kimi K2.6 | - | Generacion de contenido, chat, analisis |
| LLM clasificacion | Groq LLaMA 3.3 70B | - | Clasificacion de comandos de voz |
| STT | Groq Whisper Large v3 | - | Transcripcion de audio a texto |
| Embeddings | Google Gemini Embedding 001 | 768 dims | Busqueda semantica vectorial (RAG) |
| Backend auxiliar | Express.js | 4.21.2 | Proxy IA + endpoints de voz |

---

## 3. Arquitectura del Sistema

```
CLIENTE (Browser)
  React 19 SPA
    AuthContext (login/logout/register)
    VoiceContext (escucha continua, STT, TTS)
    HashRouter (20 rutas protegidas por rol)
      Servicios:
        supabase.js + api.js (CRUD directo a Supabase)
        llm.js + streaming.js (wrappers de Edge Functions + SSE)
        ai-client.js (proxy al AI Backend Express)
        voice.js (AudioContext + MediaRecorder + Groq STT)
        achievements.js (motor de 18 logros con reglas)
        understanding.js (formula de nivel de entendimiento)
        notifications.js (RPC cross-user)

SUPABASE BaaS
  Auth (JWT, OTP, magic links, RLS)
  Postgres 17 + pgvector (11 tablas, match_documents())
  Storage (archivos PDF, DOCX, TXT)
  Realtime (notificaciones via WebSocket)
  Edge Functions (15 funciones serverless Deno/TS)

AI BACKEND (Express.js :3001)
  /api/roadmap        -> NVIDIA Kimi K2.6 (fallback Groq)
  /api/ask            -> NVIDIA Kimi K2.6
  /api/ask-stream     -> NVIDIA Kimi K2.6 (SSE)
  /api/quiz           -> NVIDIA Kimi K2.6
  /api/analyze-error  -> NVIDIA Kimi K2.6 (SSE)
  /api/analyze-errors-batch -> NVIDIA Kimi K2.6 (cache)
  /api/voice/transcribe -> Groq Whisper Large v3
  /api/voice/categorize  -> Groq LLaMA 3.3 70B
  /api/voice/ask      -> NVIDIA Kimi K2.6

PROVEEDORES EXTERNOS
  NVIDIA: moonshotai/kimi-k2.6 (texto)
  Groq: llama-3.3-70b-versatile + whisper-large-v3 (voz + fallback)
  Google: gemini-embedding-001 (vectores RAG, 768 dims)
```

### 3.1 Flujo de Datos

| Operacion | Ruta | Protocolo |
|-----------|------|-----------|
| Login / Registro | Frontend -> Supabase Auth | REST + JWT |
| CRUD cursos/nodos | Frontend -> Supabase Postgres | REST (supabase-js) |
| Busqueda semantica | Frontend -> Supabase pgvector | SQL match_documents() |
| Chat tutor IA | Frontend -> Edge Function chat -> NVIDIA | SSE streaming |
| Generar leccion | Frontend -> Edge Function generate-lesson -> NVIDIA | SSE streaming |
| Generar quiz | Frontend -> Edge Function generate-quiz -> NVIDIA | REST |
| Generar roadmap | Frontend -> AI Backend /api/roadmap -> NVIDIA | REST |
| Analisis errores | Frontend -> AI Backend /api/analyze-error -> NVIDIA | SSE streaming |
| Transcripcion voz | Frontend -> AI Backend /api/voice/transcribe -> Groq | REST + multipart |
| Clasificar comando | Frontend -> AI Backend /api/voice/categorize -> Groq | REST |
| Embeddings RAG | Edge Function embed-source -> Google Gemini | REST |
| Notificaciones | Frontend -> Supabase Realtime | WebSocket |

---

## 4. Modelos de IA

### 4.1 Estrategia Multimodelo (3 proveedores, 4 modelos)

| Proveedor | Modelo | Dimension | Uso | Prioridad |
|-----------|--------|-----------|-----|-----------|
| Groq | llama-3.3-70b-versatile | - | Clasificacion de comandos de voz, fallback de texto | Primaria |
| NVIDIA | moonshotai/kimi-k2.6 | 8192 context | Chat, lecciones, quizzes, roadmaps, analisis | Secundaria (fallback) |
| Groq | whisper-large-v3 | - | Speech-to-Text (espanol) | Unica |
| Google | gemini-embedding-001 | 768 | Embeddings vectoriales para RAG | Unica |

Estrategia de failover en AI Backend: (1) intentar Groq, (2) si falla, NVIDIA con hasta 3 retries (backoff 1s, 2s, 4s), (3) si NVIDIA da 429, reintentar con backoff exponencial.

### 4.2 Ajuste de Temperatura por Nivel del Estudiante

| Nivel | Rango (%) | Temperatura | Comportamiento del LLM |
|-------|-----------|-------------|----------------------|
| Inicial | 0-30 | 0.7 | Lenguaje simple, analogias cotidianas |
| En progreso | 31-70 | 0.5 | Lenguaje estandar, ejemplos practicos |
| Avanzado | >70 | 0.3 | Lenguaje tecnico, terminologia especializada |

---

## 5. Roles de Usuario

### 5.1 Estudiante

Pantallas: /dashboard, /explore, /roadmap/:courseId, /lesson/:courseId/:nodeId, /quiz/:courseId/:nodeId, /quiz/result, /review/:courseId/:nodeId, /coliseo/:courseId, /achievements, /profile, /settings.

Interacciones: con sistema IA (tutor via chat en lecciones), con docente (via reportes automaticos y alertas de dificultad), con padres (via vinculacion de cuentas).

### 5.2 Docente

Pantallas: /teacher, /teacher/design/:courseId, /teacher/courses/:courseId/review, /roadmap/:courseId, /profile, /settings.

Permisos: crear/editar/eliminar cursos propios, subir material fuente, generar roadmaps via IA, editar/rechazar/regenerar nodos, ver dashboard analitico de estudiantes inscritos, recibir alertas. No puede ver datos de estudiantes no inscritos en sus cursos.

### 5.3 Padre

Pantallas: /parent, /profile, /settings.

Permisos: vincularse a cuenta de estudiante mediante DNI, ver dashboard read-only (tiempo de estudio, sincronia, medallas, alertas). No puede responder evaluaciones ni modificar progreso.

---

## 6. Catalogo de Funcionalidades

### 6.1 Autenticacion

- Login email+password con validacion visual y errores clasificados por tipo (creds, unconfirmed, network, rate limit)
- Login modo magic link (envio de enlace al email)
- Registro wizard 3 pasos con seleccion de rol (estudiante, docente, padre)
- Recuperacion de contrasena via Supabase Auth
- Onboarding con 5 toggles de accesibilidad + seleccion de avatar (8 opciones) y mascota (3 tipos: dragon, robot, buho)

### 6.2 Estudiante

- Dashboard con saludo dinamico (horario), card "Continuar" con progreso, retos del dia (2), grid de cursos
- Roadmap SVG interactivo con camino serpiente, 5 tipos de nodo (theory, practice, quiz, boss, reward), 4 estados (locked, available, in_progress, completed), mascota guia
- Leccion con contenido renderizado en bloques, chat tutor IA lateral (streaming SSE), versiones alternativas generadas por IA
- Quiz con timer de 30s por pregunta, feedback instantaneo con mascota, score ring al finalizar
- Review Hub con analisis de errores por IA, pregunta al tutor, busqueda de video relacionado
- Coliseo de Retos con 3 vidas, timer global de 30 min, preguntas generadas por IA con fallback a nodos completados
- 18 logros con rarezas (common, rare, epic, legendary) y motor de reglas evaluado en backend
- Navegacion por voz con 30+ comandos, transcripcion Groq Whisper, clasificacion Groq LLaMA

### 6.3 Docente

- Panel con estadisticas (total cursos, estudiantes activos, progreso promedio)
- Creacion de curso en modal con 3 pasos (informacion, material fuente, codigo de invitacion)
- Roadmap Designer: editor visual SVG con chat IA para modificar nodos (agregar, eliminar, mover, cambiar tipo)
- Content Review: cola de nodos pendientes de aprobacion, acciones por nodo (aprobar, rechazar, regenerar)
- CourseDetailModal: participantes reales con progreso individual, busqueda de estudiantes por DNI/email

### 6.4 Padre

- Vinculacion de estudiantes mediante busqueda por DNI con confirmacion inmediata
- Dashboard con cards de estudiantes vinculados (progreso, entendimiento, ultima actividad)
- Grafico semanal de tiempo de estudio (recharts LineChart)
- Cursos expandibles por estudiante con progreso y nivel de entendimiento

### 6.5 Voz

- Escucha continua via Web Speech API + AudioContext AnalyserNode (threshold RMS 0.015)
- Deteccion de silencio (2s) para procesar audio
- Transcripcion Groq Whisper Large v3 (espanol)
- Clasificacion Groq LLaMA 3.3 70B (temperatura 0.1) en 9 categorias
- 30+ comandos: navegacion (12), quiz (7), leccion (3), resultado (3), coliseo (2), sistema (8)
- TTS via Web Speech API con configuración de idioma, velocidad y tono
- VoiceIndicator FAB con estados idle/active/processing

### 6.6 Notificaciones

- 12 tipos: medal, progress, quiz_result, enrollment, new_student, student_progress, inactivity_alert, child_progress, child_medal, parent_request, parent_linked, coliseo_result
- RPC insert_notification con SECURITY DEFINER para bypass RLS (notificaciones cross-user)
- Supabase Realtime con suscripcion a cambios en tabla notifications
- Polling fallback cada 30s si Realtime falla
- Badge de no leidas en Header, "Marcar todas leidas", marcado individual al click

---

## 7. Gamificacion

### 7.1 Experiencia (XP)

| Accion | XP |
|--------|-----|
| Completar leccion teorica | +20 |
| Quiz aprobado (>=60%) | +30 |
| Quiz perfecto (100%) | +50 |
| Examen final (boss) | +80 |
| Coliseo (victoria) | 150 + 30 por acierto |

### 7.2 Niveles de Mascota

| Nivel | XP | Apariencia |
|-------|-----|------------|
| 1 (Bebe) | 0-499 | Tamano pequeno |
| 2 (Juvenil) | 500-1499 | Tamano medio |
| 3 (Adulto) | 1500+ | Tamano completo |

Tipos: dragon (rojo #EF4444), robot (azul #3B82F6), buho (purpura #8B5CF6). Calculo: `Math.floor((pet_xp || 0) / 500) + 1`.

### 7.3 Medallas (18 logros)

| ID | Nombre | Condicion | Rareza |
|----|--------|-----------|--------|
| first_quiz | Primer Paso | Primer quiz completado | Common |
| perfect_quiz | Mente Brillante | 100% en un quiz | Rare |
| five_quizzes | Estudiante Dedicado | 5 quizzes | Rare |
| ten_quizzes | Evaluador Experto | 10 quizzes | Epic |
| boss_slayer | Guerrero del Conocimiento | Examen final aprobado | Epic |
| all_perfect | Perfeccionista | 100% en todos los quizzes de un curso | Legendary |
| three_courses | Mente Curiosa | 3 cursos inscritos | Rare |
| ten_nodes | Explorador | 10 nodos de teoria | Common |
| coliseo_win | Campeon del Coliseo | Victoria en Coliseo | Epic |
| coliseo_perfect | Leyenda del Coliseo | Victoria sin perder vidas | Legendary |
| first_course | Primer Curso | Primer curso completado | Rare |
| streak_3 | Buen Habito | 3 dias seguidos | Common |
| streak_7 | Racha Imparable | 7 dias seguidos | Epic |
| speedster | Velocista | Quiz < 2 min con >80% | Rare |
| night_owl | Noctambulo | Estudiar despues de las 10 PM | Common |
| first_review | Aprendiz Reflexivo | Primera revision de errores | Common |
| ai_chat | Compannero de Estudio | Primer uso del tutor IA | Common |
| ai_intensive | Dependiente de IA | 10 interacciones con tutor | Rare |

Rarezas: Common (#A6A6BC), Rare (#3B82F6), Epic (#8B5CF6), Legendary (#F59E0B).

---

## 8. Nivel de Entendimiento (Sincronia)

Formula: `S = (P x 0.50) + (Nc x 0.25) + (Er x 0.15) + (Te x 0.10)`

| Variable | Significado | Calculo | Peso |
|----------|-------------|---------|------|
| P | Desempeno en quizzes | min(avgScore / 100, 1) | 50% |
| Nc | Nodos completados | completados / total | 25% |
| Er | Ratio de aciertos | aciertos / (aciertos + errores) | 15% |
| Te | Esfuerzo de estudio | min(horas_estudio / 2, 1) | 10% |

Rangos: 0-30% (rojo #EF4444, Inicial), 31-60% (naranja #F97316, En progreso), 61-85% (azul #3B82F6, Competente), 86-100% (purpura #8B5CF6, Avanzado).

---

## 9. Base de Datos (11 tablas)

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| profiles | Perfiles de usuario | id, role, full_name, dni, avatar_id, pet_type, pet_xp, accessibility_settings, onboarding_completed |
| courses | Cursos | id, teacher_id, title, category, status (draft/published/archived), rigor (1-5), invite_code, invite_token |
| nodes | Nodos del roadmap | id, course_id, position, type (theory/quiz/boss/practice/reward), title, content, status (pending_review/published) |
| enrollments | Inscripciones | id, student_id, course_id, ai_interactions, study_time_sec (UNIQUE student_id + course_id) |
| progress | Progreso por nodo | id, enrollment_id, node_id, state (locked/available/in_progress/completed), score, attempts |
| source_files | Archivos subidos | id, course_id, filename, file_type, status, chunks_count |
| documents | Chunks RAG con embeddings | id, course_id, content, embedding vector(768), chunk_index |
| weaknesses | Debilidades del estudiante | id, student_id, course_id, concept, confusion_level, total_errors |
| medals | Medallas obtenidas | id, student_id, medal_type, name, achievement, rarity |
| notifications | Notificaciones in-app | id, user_id, type (12 tipos), payload jsonb, read |
| parent_links | Vinculacion padre-estudiante | id, parent_id, student_id, status (pending/accepted/rejected) |

---

## 10. Edge Functions (15)

| Funcion | Streaming | RAG | DB | Proposito |
|---------|-----------|-----|-----|-----------|
| chat | SI | SI | NO | Tutor IA del estudiante |
| chat-roadmap | NO | NO | NO | Asistente IA para docente |
| analyze-error | NO | NO | NO | Analisis de error |
| generate-roadmap | NO | NO | SI | Roadmap completo del curso |
| generate-lesson | SI | SI | SI | Contenido teorico de un nodo |
| generate-quiz | NO | SI | SI | Preguntas de quiz para un nodo |
| generate-test | NO | NO | NO | Examen de unidad (10 preguntas) |
| generate-coliseo | NO | NO | NO | Desafio del Coliseo |
| generate-course-content | NO | NO | SI | Contenido en lote para todos los nodos |
| generate-medal-svg | NO | NO | SI | SVG dinamico de medalla |
| reinforce | SI | SI | NO | Refuerzo con explicacion alternativa |
| register-user | NO | NO | SI | Creacion de cuenta |
| upload-source | NO | NO | SI | Subida de archivo a Storage |
| embed-source | NO | SI | SI | ETL: archivo a chunks a embeddings |
| youtube-transcript | NO | NO | NO | Transcripcion de YouTube |

---

## 11. Cuentas de Prueba

| Rol | Email | Contrasena | DNI |
|-----|-------|-----------|-----|
| Estudiante | default_student@eduapp.test | student123 | 11111111 |
| Docente | default_teacher@eduapp.test | teacher123 | 22222222 |
| Padre | default_parent@eduapp.test | parent123 | 33333333 |

Usuarios adicionales (11): maria.lopez@eduapp.test (docente), carlos.ruiz@eduapp.test (docente), ana.garcia@eduapp.test (estudiante), luis.martinez@eduapp.test (estudiante), sofia.torres@eduapp.test (estudiante), diego.vargas@eduapp.test (estudiante), valeria.rios@eduapp.test (estudiante), 4 padres vinculables.

---

## 12. Seguridad

| Medida | Implementacion |
|--------|----------------|
| Row Level Security (RLS) | Todas las tablas. SELECT/UPDATE solo propios datos |
| Autenticacion JWT | Tokens de acceso con expiracion (1h), refresh automatico |
| Sanitizacion DOMPurify | Todo contenido IA sanitizado antes de renderizar |
| CORS | Configurado en todas las Edge Functions (_shared/cors.ts) |
| API Keys en backend | NVIDIA, Gemini, Groq keys nunca llegan al browser |
| Bearer token validation | Edge Functions validan JWT del usuario |
| API Key auth (AI Backend) | X-API-Key header requerido en produccion |
| Contrasenas cifradas | pgcrypto en auth.users |

Riesgos identificados: contrasena en texto plano en profiles.password (demo only), VITE_NVIDIA_API_KEY en frontend (key con permisos limitados), sin rate limiting en Edge Functions.

---

## 13. Metricas del Proyecto

| Metrica | Valor |
|---------|-------|
| Paginas frontend | 20 |
| Componentes compartidos | 8 |
| Librerias/utilidades | 13 |
| Edge Functions | 15 |
| Migraciones SQL | 13 |
| Tablas en BD | 11 |
| Scripts de testing | 24 |
| Lineas de codigo frontend | ~10,000 |
| Lineas de codigo backend | ~2,500 |
| Logros | 18 |
| Tipos de notificacion | 12 |
| Comandos de voz | 30+ |
| Modelos de IA | 4 (3 proveedores) |
