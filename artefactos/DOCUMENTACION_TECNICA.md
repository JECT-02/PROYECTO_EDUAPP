# EduApp — Documentación Técnica

> Para el equipo de desarrollo, DevOps y arquitectos.
> Complementa `DOCUMENTACION_CLIENTE.md` (vista cliente) y `DISENO_UX_UI.md` (vista diseño).
> **Versión:** 2.0.0 | **Última actualización:** 24/06/2026

---

## Índice

1. [Estructura de Archivos](#1-estructura-de-archivos)
2. [Convenciones de Código](#2-convenciones-de-código)
3. [Frontend: Arquitectura React](#3-frontend-arquitectura-react)
4. [Base de Datos: Esquema Completo](#4-base-de-datos-esquema-completo)
5. [API: Edge Functions (15)](#5-api-edge-functions-15)
6. [API: AI Backend Express (9 endpoints)](#6-api-ai-backend-express-9-endpoints)
7. [Sistema de Voz: Arquitectura Completa](#7-sistema-de-voz-arquitectura-completa)
8. [Sistema de Gamificación: Internals](#8-sistema-de-gamificación-internals)
9. [Sistema de Notificaciones](#9-sistema-de-notificaciones)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Despliegue](#11-despliegue)
12. [Testing](#12-testing)
13. [Troubleshooting](#13-troubleshooting)
14. [Glosario Técnico](#14-glosario-técnico)

---

## 1. Estructura de Archivos

```
PROYECTO_EDUAPP/
│
├── src/                            # Frontend React (JavaScript, NO TypeScript)
│   ├── components/                 # 8 componentes reutilizables
│   │   ├── CourseCreateModal.jsx   #   Wizard de creación de curso (3 pasos)
│   │   ├── CourseDetailModal.jsx   #   Modal de detalle con participantes y alertas
│   │   ├── Header.jsx / .css      #   Barra de navegación global + notificaciones Realtime
│   │   ├── Mascot.jsx / .css      #   Mascota animada (3 tipos × 4 moods × 3 tamaños)
│   │   ├── PageWrapper.jsx        #   Contenedor framer-motion (AnimatePresence)
│   │   ├── StarsBackground.jsx    #   Fondo animado de estrellas (CSS vars)
│   │   ├── VoiceIndicator.jsx     #   FAB de micrófono (estados: idle/active/processing)
│   │   └── (Header.css, Mascot.css)
│   │
│   ├── context/                    # Estado global (React Context)
│   │   ├── AuthContext.jsx         #   Auth: user, login, register, logout, linkedStudents
│   │   └── VoiceContext.jsx        #   Voz: escucha continua, STT, clasificación, TTS
│   │
│   ├── lib/                        # 13 utilidades/servicios (~2,500 LOC)
│   │   ├── achievements.js         #   Sistema de logros (checkAchievements, 18 medallas)
│   │   ├── ai-client.js            #   Proxy al AI Backend Express (/api/roadmap, /api/ask, /api/quiz)
│   │   ├── api.js                  #   ~40 funciones CRUD a Supabase
│   │   ├── gemini.js               #   EXTRACCIÓN de PDF con pdfjs-dist (nombre engañoso: NO es IA)
│   │   ├── llm.js                  #   Wrappers de 15 Edge Functions (chat, generate-*, etc.)
│   │   ├── markdown.js             #   Renderizado de lecciones: marked → DOMPurify
│   │   ├── notifications.js        #   Helpers cross-user via RPC insert_notification
│   │   ├── sanitize.js             #   DOMPurify wrapper (ALLOWED_TAGS + ALLOWED_ATTR)
│   │   ├── streaming.js            #   Cliente SSE genérico (streamFunction + callFunction)
│   │   ├── supabase.js             #   Cliente Supabase + helpers de sesión
│   │   ├── understanding.js        #   Fórmula S = (P×0.50) + (Nc×0.25) + (Er×0.15) + (Te×0.10)
│   │   ├── voice-commands.js       #   Catálogo de comandos de voz (30+ acciones)
│   │   └── voice.js               #   Web Speech API + AudioContext + Groq STT
│   │
│   ├── pages/                      # 20 páginas (JSX + CSS cada una)
│   │   ├── Login.jsx/.css          #   Login con email+password y magic link
│   │   ├── Register.jsx/.css       #   Registro wizard 3 pasos (rol → datos → confirmación)
│   │   ├── ForgotPassword.jsx      #   Recuperación de contraseña
│   │   ├── OnboardingAccess.jsx/.css #  Onboarding accesibilidad (5 toggles)
│   │   ├── OnboardingAvatar.jsx/.css #  Onboarding avatar (8) + mascota (3)
│   │   ├── Dashboard.jsx/.css      #   Panel estudiante: greeting, continuar, retos, cursos
│   │   ├── Explore.jsx/.css        #   Catálogo público de cursos
│   │   ├── Roadmap.jsx/.css        #   SVG serpiente interactivo con nodos
│   │   ├── Lesson.jsx/.css         #   Lección: typewriter, chat IA, versiones alternativas
│   │   ├── Quiz.jsx/.css           #   Quiz: timer 30s, 4 opciones, feedback mascota
│   │   ├── QuizResult.jsx/.css     #   Score ring, XP, achievements check, navegación
│   │   ├── Review.jsx/.css         #   Corrección: análisis IA, refuerzo, video
│   │   ├── Coliseo.jsx/.css        #   Coliseo: 3 vidas, timer 30min, IA generation
│   │   ├── Achievements.jsx/.css   #   18 medallas con rarezas y estados
│   │   ├── TeacherDashboard.jsx/.css # Panel docente: stats, cursos, modales
│   │   ├── RoadmapDesigner.jsx/.css #  Editor visual roadmap + chat IA
│   │   ├── ContentReview.jsx/.css  #   Cola de revisión IA: aprobar/rechazar/regenerar
│   │   ├── ParentDashboard.jsx/.css #  Panel familiar: vinculación, stats, gráficos
│   │   ├── Profile.jsx/.css        #   Perfil: datos, credenciales, mascota
│   │   └── Settings.jsx/.css       #   Configuración: preferencias + accesibilidad
│   │
│   ├── utils/                      # Utilidades ligeras
│   │   ├── sounds.js               #   Web Audio API (correct, incorrect, timeout, victory)
│   │   └── vibration.js            #   Vibration API (correct, incorrect, timeout, warning)
│   │
│   ├── data/
│   │   └── achievements.json       #   Catálogo de 18 logros con rules
│   │
│   ├── App.jsx                     # Router principal (HashRouter + VoiceProvider)
│   ├── App.css                     # Estilos legacy (poco uso)
│   ├── main.jsx                    # Entry point + applySavedPrefs()
│   └── index.css                   # Variables CSS + reset + modos accesibilidad
│
├── supabase/                       # Backend Supabase
│   ├── functions/                  # 15 Edge Functions (Deno/TypeScript)
│   │   ├── _shared/                #   Utilidades compartidas
│   │   │   ├── llm.ts              #     Wrapper NVIDIA API (kimi-k2.6)
│   │   │   ├── embeddings.ts       #     Wrapper Google Gemini (embedding-001)
│   │   │   ├── supabase-admin.ts   #     Clientes Supabase (service_role + user)
│   │   │   ├── cors.ts             #     Headers CORS
│   │   │   ├── chunker.ts          #     División de texto (1200 chars, overlap 200)
│   │   │   ├── extractors/         #     pdf.ts, docx.ts, txt.ts, youtube.ts
│   │   │   └── prompts/            #     System prompts por función
│   │   │       ├── roadmap.ts
│   │   │       ├── quiz.ts
│   │   │       ├── lesson.ts
│   │   │       └── analyze-error.ts
│   │   ├── analyze-error/index.ts
│   │   ├── chat/index.ts
│   │   ├── chat-roadmap/index.ts
│   │   ├── embed-source/index.ts
│   │   ├── generate-coliseo/index.ts
│   │   ├── generate-course-content/index.ts
│   │   ├── generate-lesson/index.ts
│   │   ├── generate-medal-svg/index.ts
│   │   ├── generate-quiz/index.ts
│   │   ├── generate-roadmap/index.ts
│   │   ├── generate-test/index.ts
│   │   ├── register-user/index.ts
│   │   ├── reinforce/index.ts
│   │   ├── upload-source/index.ts
│   │   └── youtube-transcript/index.ts
│   ├── migrations/                 # 13 migraciones SQL
│   │   ├── 20260602200820_init.sql
│   │   ├── ...
│   │   └── 20260602200832_medals_insert_self.sql
│   └── config.toml                 # Supabase CLI config
│
├── ai-backend/                     # Backend Express.js auxiliar
│   ├── server.js                   # ~900 LOC: 9 endpoints, Groq+NVIDIA, voice, streaming
│   └── package.json
│
├── scripts/                        # 24 scripts de testing y utilidad (.mjs)
│   ├── seed-test-users.mjs         #   Crea 3 cuentas base
│   ├── seed-test-accounts.mjs      #   Crea 11 cuentas adicionales
│   ├── seed-material.mjs          #   Seed de material de ejemplo
│   ├── test-e2e-teacher-student.mjs # Test E2E flujo completo
│   ├── test-chat.mjs               #   Test Edge Function chat
│   ├── test-roadmap*.mjs           #   Tests de generación de roadmap
│   ├── test-quiz*.mjs              #   Tests de quizzes y review
│   ├── test-nvidia*.mjs            #   Tests de NVIDIA API
│   ├── test-search*.mjs            #   Tests de búsqueda RAG
│   ├── test-enrollment-flow.mjs    #   Test flujo de inscripción
│   ├── test-progress-persistence.mjs # Test persistencia de progreso
│   ├── test-teacher-flow.mjs       #   Test flujo docente
│   └── test-truncated.mjs          #   Test contenido truncado
│
├── docs/                           # Documentación del proyecto
│   ├── ARCHITECTURE.md
│   ├── DESIGN.md
│   ├── SPEC.md
│   ├── DEMO.md
│   └── STATUS.md
│
├── artefactos/                     # Documentación para cliente
│   ├── DISENO_UX_UI.md
│   ├── DOCUMENTACION_CLIENTE.md
│   └── DOCUMENTACION_TECNICA.md    # ← Este archivo
│
├── .agents/                        # Skills para modelos de IA
│   ├── roadmap-regulation/
│   │   └── SKILL.md
│   └── skills/                     # 8 skills instaladas
│       ├── frontend-design/
│       ├── accessibility/
│       ├── react-best-practices/
│       ├── vite/
│       ├── nodejs-backend-patterns/
│       ├── nodejs-best-practices/
│       ├── composition-patterns/
│       ├── supabase/
│       └── supabase-postgres-best-practices/
│
├── AGENTS.md                       # Guía para modelos de IA
├── package.json                    # Dependencias frontend
├── vite.config.js                  # Configuración Vite
├── eslint.config.js                # Configuración ESLint
├── index.html                      # Entry point HTML
├── iniciar.bat                     # Script inicio completo
└── instalar.bat                    # Script instalación
```

---

## 2. Convenciones de Código

### 2.1 Nomenclatura de Archivos

| Tipo | Convención | Ejemplos |
|------|------------|----------|
| Componentes React | PascalCase | `TeacherDashboard.jsx`, `CourseCreateModal.jsx` |
| Estilos CSS | Mismo nombre que el componente | `TeacherDashboard.css`, `Quiz.css` |
| Librerías/Utilidades | camelCase | `supabase.js`, `voice-commands.js`, `streaming.js` |
| Edge Functions | kebab-case | `generate-lesson/`, `analyze-error/` |
| Migraciones SQL | timestamp + nombre | `20260602200820_init.sql` |
| Scripts de test | kebab-case | `test-e2e-teacher-student.mjs` |

### 2.2 Frontend (React/JavaScript)

- **NO TypeScript** — JavaScript puro con JSX
- **Functional components** con hooks (sin class components)
- **Imports:** Named imports de librerías (`import { useState } from 'react'`)
- **Supabase:** Siempre a través de `src/lib/supabase.js` y `src/lib/api.js`
- **Edge Functions:** Llamar desde `src/lib/llm.js` o `src/lib/streaming.js`
- **Animaciones:** framer-motion para páginas, CSS keyframes para micro-interacciones
- **Iconos:** lucide-react (importaciones tree-shakeables)

### 2.3 CSS

- **Un archivo CSS por componente** junto al JSX
- **Clases BEM-like** pero sin estricto BEM (`.card-main`, `.btn-primary`, `.input-field`)
- **Variables CSS** definidas en `index.css` (paleta de colores, radios, transiciones)
- **Responsive:** Mobile-first con breakpoints en `index.css`
- **Modos accesibilidad:** Clases en `<body>` que sobreescriben variables CSS

### 2.4 Edge Functions (Deno/TypeScript)

- Cada función en su carpeta con `index.ts`
- Usar utilidades de `_shared/` (no duplicar código)
- Siempre manejar CORS con `_shared/cors.ts`
- Siempre autenticar con `getUserClient(req).auth.getUser(token)`
- LLM: usar `callLlm()` de `_shared/llm.ts`
- Embeddings: usar `embedQuery()` / `embedTexts()` de `_shared/embeddings.ts`
- Respuestas: `jsonOk(data)` / `jsonError(message, status)`

---

## 3. Frontend: Arquitectura React

### 3.1 Entry Point (`main.jsx`)

```javascript
// Orden de carga:
1. applySavedPrefs()              // ← Aplica accesibilidad desde localStorage ANTES de render
2. ReactDOM.createRoot → render(  // ← Renderiza el árbol
    <React.StrictMode>
      <AuthProvider>              // ← AuthContext (login/logout/register)
        <App />                   // ← HashRouter + VoiceProvider + Routes
      </AuthProvider>
    </React.StrictMode>
  )
```

### 3.2 Router (`App.jsx`)

```
HashRouter
├── VoiceProvider
│   ├── StarsBackground (global, z-index: 0)
│   ├── FocusManager (focus #main-content en cada ruta)
│   ├── Skip link (#main-content)
│   ├── MotionConfig (respeta reduce-motion)
│   ├── AnimatePresence mode="wait"
│   │   └── Routes
│   │       ├── / → /login (redirect)
│   │       ├── /login → PublicRoute → Login
│   │       ├── /register → Register
│   │       ├── /forgot-password → PublicRoute → ForgotPassword
│   │       ├── /onboarding/accessibility → OnboardingAccess
│   │       ├── /onboarding/avatar → OnboardingAvatar
│   │       │
│   │       ├── /teacher → ProtectedRoute(teacher) → TeacherDashboard
│   │       ├── /teacher/courses/:id/review → ProtectedRoute(teacher) → ContentReview
│   │       ├── /teacher/design/:id → ProtectedRoute(teacher) → RoadmapDesigner
│   │       │
│   │       ├── /parent → ProtectedRoute(parent) → ParentDashboard
│   │       │
│   │       ├── /dashboard → ProtectedRoute(student) → Dashboard
│   │       ├── /explore → ProtectedRoute(student) → Explore
│   │       ├── /roadmap/:courseId → ProtectedRoute(student,teacher) → Roadmap
│   │       ├── /lesson/:courseId/:nodeId → ProtectedRoute(student,teacher) → Lesson
│   │       ├── /quiz/:courseId/:nodeId → ProtectedRoute(student,teacher) → Quiz
│   │       ├── /quiz/result → ProtectedRoute(student,teacher) → QuizResult
│   │       ├── /coliseo/:courseId → ProtectedRoute(student,teacher) → Coliseo
│   │       ├── /coliseo → ProtectedRoute(student,teacher) → Coliseo
│   │       ├── /achievements → ProtectedRoute(student) → Achievements
│   │       ├── /review/:courseId/:nodeId → ProtectedRoute(student,teacher) → Review
│   │       ├── /review → ProtectedRoute(student,teacher) → Review
│   │       ├── /profile → ProtectedRoute(all) → Profile
│   │       └── /settings → ProtectedRoute(all) → Settings
│   └── VoiceIndicator (FAB global)
```

### 3.3 Protección de Rutas

```javascript
// ProtectedRoute: verifica autenticación + rol + onboarding
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading, user, checkOnboardingComplete } = useAuth()

  if (loading) return <RouteFallback />        // ← Spinner
  if (!isAuthenticated) return <Navigate to="/login" />
  if (role === null) return <RouteFallback />   // ← Sin perfil cargado
  if (!checkOnboardingComplete(user)) return <Navigate to="/onboarding/accessibility" />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to={redirectMap[role]} />

  return children
}
```

### 3.4 AuthContext (`src/context/AuthContext.jsx`)

**Estado Global:**
```javascript
{
  user: { id, email, role, name, avatar, fullProfile, isAuthenticated, onboardingCompleted } | null,
  role: 'student' | 'teacher' | 'parent' | null,
  isAuthenticated: boolean,
  loading: boolean,
  studentId: string | null,        // ← Alias de user.id
  linkedStudents: [{ id, linkId, name }],
}
```

**Funciones Exportadas:**
| Función | Parámetros | Retorno | Efectos |
|---------|-----------|---------|---------|
| `login` | `{ email, password, magicLink }` | `{ user }` o `{ magicSent }` | Actualiza estado global, refresh linkedStudents si parent |
| `register` | `{ email, password, fullName, role, ... }` | `{ needsConfirmation }` | Crea auth.user + profile via Edge Function |
| `logout` | — | — | SignOut de Supabase, limpia estado, remueve clases accesibilidad |
| `linkStudent` | `(studentEmail, directStudentId)` | `{ success, student }` | Vincula padre → estudiante, refresca linkedStudents |
| `unlinkStudent` | `(linkIdOrStudentId)` | — | Elimina parent_link |
| `refreshProfile` | — | — | Recarga fullProfile desde Supabase |
| `updateProfile` | `(updates)` | `{ data, error }` | Actualiza profiles y sincroniza estado global |

### 3.5 VoiceContext (`src/context/VoiceContext.jsx`)

**Estado Global:**
```javascript
{
  voiceEnabled: boolean,       // ← Persistido en localStorage
  listening: boolean,          // ← Micrófono activo
  audioLevel: number,          // ← RMS 0-1
  status: 'idle' | 'active' | 'processing',
  transcript: string,          // ← Último texto transcrito
  feedback: string,            // ← Mensaje de feedback al usuario
  error: string,               // ← Error del último comando
}
```

**Ciclo de vida de un comando de voz:**
```
1. toggleVoice() → voiceEnabled = true
2. useEffect → startContinuousListening()
3. AudioContext AnalyserNode → detecta speech (RMS > 0.015)
4. MediaRecorder.start() → graba audio
5. 2s de silencio → MediaRecorder.stop() → Blob audio/webm
6. transcribe(blob) → fetch POST /api/voice/transcribe → Groq whisper
7. categorize(text, context) → fetch POST /api/voice/categorize → Groq LLaMA
8. executeVoiceAction(result, originalText):
   a. Busca handler registrado (registerHandler)
   b. Si no hay handler:
      - navigate: navega a ruta
      - quiz_answer: ejecuta selectOption registrado
      - system_action: lee pantalla, notificaciones, ayuda, etc.
      - question/unknown: askVoiceQuestion() → /api/voice/ask
```

**Register Handler Pattern:**
```javascript
// En página de quiz:
useEffect(() => {
  const unreg = registerHandler('selectOption', ({ index }) => {
    handleSelect(index);        // ← Función local de Quiz.jsx
  });
  return unreg;                 // ← Cleanup al desmontar
}, [handleSelect]);
```

---

## 4. Base de Datos: Esquema Completo

### 4.1 Tablas y Columnas

```sql
-- ========================================
-- Tabla: profiles (extiende auth.users)
-- ========================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  full_name text,
  email text,
  dni text,
  password text,                             -- DEMO ONLY: texto plano
  age_band text,                             -- '7-10' | '11-14' | '15-17' | '18+'
  institution text,
  institution_short text,
  subject text,
  relation text,                             -- 'Padre' | 'Madre' | 'Tutor legal' | ...
  avatar_id int,                             -- Índice 0-7 en AVATARS[]
  pet_type text CHECK (pet_type IN ('dragon', 'robot', 'owl')),
  pet_name text,
  pet_xp int DEFAULT 0,
  accessibility_settings jsonb DEFAULT '{}', -- { contrast, narration, reduced, voice, large_text, colorblind }
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- Tabla: courses
-- ========================================
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,                              -- 'Matemáticas' | 'Ciencias' | ...
  level text,                                 -- '7-10' | '11-14' | '15-17' | '18+'
  cover_url text,
  cover_color text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  rigor int DEFAULT 3 CHECK (rigor >= 1 AND rigor <= 5),
  invite_code text UNIQUE,                   -- Código legible para estudiantes
  invite_token text UNIQUE,                  -- Token UUID para enlaces
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- Tabla: nodes
-- ========================================
CREATE TABLE nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  position int NOT NULL,
  type text CHECK (type IN ('theory', 'practice', 'quiz', 'boss', 'reward')),
  title text NOT NULL,
  description text,
  content text,                              -- HTML para theory, JSON para quiz/boss
  quiz_data jsonb,                           -- Alternativa a content para quizzes
  status text DEFAULT 'pending_review' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (course_id, position)
);

-- ========================================
-- Tabla: enrollments
-- ========================================
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  ai_interactions int DEFAULT 0,
  study_time_sec int DEFAULT 0,
  UNIQUE (student_id, course_id)
);

-- ========================================
-- Tabla: progress
-- ========================================
CREATE TABLE progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE CASCADE,
  node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  state text CHECK (state IN ('locked', 'available', 'in_progress', 'completed')),
  score int,
  attempts int DEFAULT 0,
  completed_at timestamptz,
  UNIQUE (enrollment_id, node_id)
);

-- ========================================
-- Tabla: source_files
-- ========================================
CREATE TABLE source_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  filename text,
  file_type text,                             -- 'pdf' | 'docx' | 'txt' | 'youtube'
  file_url text,
  status text DEFAULT 'uploading',            -- 'uploading' | 'processing' | 'ready' | 'error'
  chunks_count int,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- Tabla: documents (RAG vector store)
-- ========================================
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  source_id uuid REFERENCES source_files(id) ON DELETE CASCADE,
  content text,
  chunk_index int,
  embedding vector(768),                      -- gemini-embedding-001: 768 dimensiones
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- Función: match_documents (búsqueda semántica)
-- ========================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_course_id uuid DEFAULT NULL
) RETURNS TABLE (
  id uuid, content text, similarity float, course_id uuid, source_id uuid, chunk_index int
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity,
    documents.course_id,
    documents.source_id,
    documents.chunk_index
  FROM documents
  WHERE (p_course_id IS NULL OR documents.course_id = p_course_id)
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ========================================
-- Tabla: weaknesses
-- ========================================
CREATE TABLE weaknesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  concept text,
  confusion_level int DEFAULT 0,
  total_errors int DEFAULT 0,
  is_error boolean DEFAULT true,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- Tabla: medals
-- ========================================
CREATE TABLE medals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  medal_type text,                             -- 'mastery' | 'behavior' | 'secret'
  name text,
  achievement text,                            -- 'first_quiz' | 'perfect_quiz' | ...
  rarity text,                                 -- 'common' | 'rare' | 'epic' | 'legendary'
  description text,
  svg_url text,
  unlocked_at timestamptz DEFAULT now()
);

-- ========================================
-- Tabla: notifications
-- ========================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN (
    'parent_request', 'alert', 'medal', 'message', 'progress',
    'quiz_result', 'enrollment', 'new_student', 'student_progress',
    'inactivity_alert', 'child_progress', 'child_medal', 'coliseo_result',
    'parent_linked'
  )),
  payload jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- Función: insert_notification (bypass RLS)
-- ========================================
CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id uuid,
  p_type text,
  p_payload jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, payload)
  VALUES (p_user_id, p_type, p_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ========================================
-- Tabla: parent_links
-- ========================================
CREATE TABLE parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- ========================================
-- Función: check_student_has_parent
-- ========================================
CREATE OR REPLACE FUNCTION check_student_has_parent(p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parent_links
    WHERE student_id = p_student_id
    AND status = 'accepted'
  );
END;
$$;
```

### 4.2 Políticas RLS (Row Level Security)

Todas las tablas tienen RLS habilitado. Resumen:

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Propio (o docente/padre vinculado) | — | Propio | — |
| `courses` | Published público, CRUD teacher dueño | Teacher dueño | Teacher dueño | Teacher dueño |
| `nodes` | Published público, todos teacher dueño | Teacher dueño | Teacher dueño | Teacher dueño |
| `enrollments` | Propio (student/parent/teacher) | Student (inscripción) | — | — |
| `progress` | Según enrollment | Según enrollment | Según enrollment | — |
| `notifications` | Propio | RPC bypass | Propio | — |
| `medals` | Propio | Propio (student) | — | — |
| `weaknesses` | Propio (student) | Propio | — | — |
| `parent_links` | Propio (parent) | Propio | — | — |

---

## 5. API: Edge Functions (15)

### 5.1 Patrón Común

Todas las Edge Functions siguen este patrón:

```typescript
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  // 1. CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  // 2. Autenticación
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await getClient().auth.getUser(token)
  if (authError || !user) return jsonError('Unauthorized', 401)

  // 3. Parse body
  const { param1, param2 } = await req.json()

  // 4. Lógica de negocio
  // ...

  // 5. Respuesta
  return jsonOk({ result })
})
```

### 5.2 Especificaciones por Función

#### `chat`
- **Propósito:** Tutor IA con RAG. Responde preguntas del estudiante basado en el material del curso.
- **Streaming:** ✅ SSE (Server-Sent Events)
- **RAG:** ✅ Busca en `documents` vía `match_documents()`
- **Parámetros:** `{ courseId, message, history[], studentLevel }`
- **Retorno:** Stream de `data: {"text":"..."}\n\n` → `data: {"done":true}\n\n`
- **Modelo:** NVIDIA Kimi K2.6
- **Temperatura:** Según `studentLevel` (0.3–0.7)

#### `generate-lesson`
- **Propósito:** Genera contenido HTML/Markdown para un nodo de teoría.
- **Streaming:** ✅ SSE
- **RAG:** ✅ Contextualiza con chunks del curso
- **Parámetros:** `{ courseId, nodeId }`
- **Retorno:** Stream de chunks de texto → contenido HTML completo
- **Prompt:** `_shared/prompts/lesson.ts`

#### `generate-quiz`
- **Propósito:** Genera 3-5 preguntas de opción múltiple para un nodo.
- **Streaming:** ❌ REST
- **RAG:** ✅
- **Parámetros:** `{ courseId, nodeId, count: 4, style: 'adaptive' }`
- **Retorno:** `{ questions: [{ id, text, options[], correct, explanation }] }`
- **Prompt:** `_shared/prompts/quiz.ts`

#### `generate-roadmap`
- **Propósito:** Genera el roadmap completo del curso analizando el material fuente.
- **Streaming:** ❌ REST
- **RAG:** ❌ (usa material raw)
- **Parámetros:** `{ courseId, files: [{ text, filename }], rigor: 3 }`
- **Retorno:** Nodos guardados en DB
- **Nota:** La versión del AI Backend es más robusta (parsea JSON, corrige errores)

#### `generate-coliseo`
- **Propósito:** Genera preguntas para el Coliseo de Retos basadas en nodos completados.
- **Parámetros:** `{ courseId, count: 10, completedNodes: string[] }`
- **Retorno:** `{ questions: [...] }`

#### `register-user`
- **Propósito:** Crea cuenta simulada (auth.user + profile) sin verificación real.
- **Parámetros:** `{ email, password, fullName, role, ... }`
- **Retorno:** `{ id, email, role }`

### 5.3 Utilidades Compartidas (`_shared/`)

| Archivo | Exportaciones | Propósito |
|---------|--------------|-----------|
| `llm.ts` | `callLlm({ system, messages, temperature, maxTokens, stream })` | LLM call con soporte SSE |
| `embeddings.ts` | `embedQuery(text)`, `embedTexts(texts[])` | Genera embeddings 768d |
| `supabase-admin.ts` | `getClient()`, `getUserClient(req)` | Clientes service_role + user |
| `cors.ts` | `corsHeaders`, `jsonOk(body)`, `jsonError(msg, status)` | CORS + response helpers |
| `chunker.ts` | `chunkText(text, { maxChars, overlap })` | Divide texto en chunks 1200 chars, overlap 200 |

---

## 6. API: AI Backend Express (9 endpoints)

### 6.1 Endpoints

| Método | Endpoint | Auth | Propósito |
|--------|----------|------|-----------|
| POST | `/api/roadmap` | `X-API-Key` o Bearer | Generar roadmap desde material |
| POST | `/api/ask` | `X-API-Key` o Bearer | Pregunta al tutor (REST) |
| POST | `/api/ask-stream` | `X-API-Key` o Bearer | Pregunta al tutor (SSE streaming) |
| POST | `/api/quiz` | `X-API-Key` o Bearer | Generar quiz desde material |
| POST | `/api/analyze-error` | `X-API-Key` o Bearer | Analizar error (SSE streaming) |
| POST | `/api/analyze-errors-batch` | `X-API-Key` o Bearer | Batch analyze con cache |
| POST | `/api/voice/transcribe` | `X-API-Key` o Bearer | STT vía Groq whisper |
| POST | `/api/voice/categorize` | `X-API-Key` o Bearer | Clasificar comando voz |
| POST | `/api/voice/ask` | `X-API-Key` o Bearer | Pregunta académica por voz |
| GET | `/api/health` | No | Health check |

### 6.2 Middleware de Autenticación

```javascript
function authenticate(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (key === API_KEY) return next();
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return next(); // Confianza en dev
  if (process.env.NODE_ENV !== 'production') return next(); // Dev mode
  res.status(401).json({ error: 'API key requerida' });
}
```

### 6.3 Estrategia LLM (callNvidia + callGroq)

```javascript
async function callNvidia({ system, userMessage, temperature, maxTokens, studentLevel, retries = 1 }) {
  // 1. Ajustar temperatura según nivel estudiante
  const effectiveTemp = studentLevel === 'beginner' ? 0.7 
    : studentLevel === 'advanced' ? 0.3 : temperature ?? 0.5;

  // 2. Añadir hint de formalidad
  const finalSystem = system + formalityHint; // principiante → simple, avanzado → técnico

  // 3. Intentar Groq primero (más rápido, sin rate limits agresivos)
  if (GROQ_API_KEY) {
    try { return await callGroq({ messages, temperature: effectiveTemp, maxTokens }); }
    catch (e) { /* fallback a NVIDIA */ }
  }

  // 4. Fallback a NVIDIA con retry
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(LLM_URL, { ... });
    if (res.ok) return json.choices[0].message.content;
    if (res.status === 429 && attempt < retries) {
      await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
      continue;
    }
    throw new Error(`NVIDIA error ${res.status}: ${errBody}`);
  }
}
```

### 6.4 Parseo de Roadmap (extractNodesFromResponse)

El parser es una pieza crítica que extrae nodos JSON de la respuesta del LLM:

1. Limpia bloques ```json
2. Intenta `JSON.parse()` directo
3. Si falla → corrige trailing commas y reintenta
4. Si falla → extrae el `{ }` más externo por conteo de braces
5. Si falla → extrae nodos individuales del array `"nodes"` por brace counting
6. Si no encuentra nodos → lanza error

Post-parseo: **Validación de contenido** (`validateNodeContent`):
- Nodos `quiz`: deben tener exactamente 4 preguntas con `{ text, options[4], correct, explanation }`
- Nodos `boss`: deben tener 5 preguntas + campo `congratulations`
- Si falla validación → genera contenido fallback automáticamente

### 6.5 Endpoints de Voz

**`/api/voice/transcribe`** (multipart):
```
Input:  audio blob (webm, hasta 10MB)
Output: { text: "transcripción", language: "es" }
Model:  Groq whisper-large-v3
```

**`/api/voice/categorize`** (JSON):
```
Input:  { transcript: "texto", context: { page, courseTitle, ... } }
Output: { category, action, params, responseText }
Model:  Groq LLaMA 3.3 70B (temperatura 0.1)
```

**`/api/voice/ask`** (JSON):
```
Input:  { question, context }
Output: { answer }
Model:  NVIDIA Kimi K2.6 (temperatura 0.3)
```

---

## 7. Sistema de Voz: Arquitectura Completa

### 7.1 Componentes

| Archivo | Rol | Tecnología |
|---------|-----|------------|
| `src/lib/voice.js` | API de voz de bajo nivel | Web Speech API, AudioContext, MediaRecorder |
| `src/lib/voice-commands.js` | Catálogo de comandos | Diccionario estático |
| `src/context/VoiceContext.jsx` | Estado global + ejecución | React Context + useNavigate |
| `src/components/VoiceIndicator.jsx` | FAB de micrófono | UI component |
| `ai-backend/server.js` | Endpoints STT y clasificación | Express + Groq API |

### 7.2 Pipeline de Audio

```
┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ getUser  │──▶│ AudioContext  │──▶│ RMS > 0.015  │──▶│ MediaRecorder│──▶│ Blob audio/  │
│ Media    │   │ AnalyserNode │   │ ¿Hay voz?    │   │ start()      │   │ webm         │
└──────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────┬───────┘
                                                                               │ 2s silencio
                                                                               ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ TTS      │◄──│ VoiceContext │◄──│ Groq LLaMA   │◄──│ Groq Whisper │◄──│ fetch POST   │
│ Web      │   │ executeAction│   │ categorize() │   │ transcribe() │   │ /api/voice/  │
│ Speech   │   │              │   │              │   │              │   │ transcribe   │
└──────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### 7.3 Configuración de Audio

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
});

const audioContext = new AudioContext();
const microphone = audioContext.createMediaStreamSource(stream);
const analyser = audioContext.createAnalyser();
analyser.fftSize = 512;
analyser.smoothingTimeConstant = 0.3;
microphone.connect(analyser);

// Thresholds
const SILENCE_THRESHOLD = 0.015;  // RMS por debajo = silencio
const SILENCE_DURATION = 2000;    // ms de silencio antes de procesar
const MAX_RECORDING = 15000;      // duración máxima de grabación (15s)
const LEVEL_CHECK_MS = 80;        // intervalo de check de nivel
```

---

## 8. Sistema de Gamificación: Internals

### 8.1 Achievements Engine (`src/lib/achievements.js`)

```javascript
// Flujo de checkAchievements:
async function checkAchievements(studentId, context) {
  // 1. Obtener medallas ya obtenidas del estudiante
  const earnedIds = await getEarnedIds(studentId);  // Set<string>

  // 2. Iterar sobre el catálogo (18 logros)
  for (const def of CATALOG) {
    if (earnedIds.has(def.id) || earnedIds.has(def.name)) continue;  // Ya tiene
    
    // 3. Evaluar regla contra contexto
    if (evaluateRule(def.rule, context)) {
      // 4. Insertar en tabla medals
      await awardMedal(studentId, def);
      
      // 5. Crear notificación
      await notifyAchievement(studentId, def.name, def.rarity);
    }
  }
}

// Evaluación de reglas:
function evaluateRule(rule, context) {
  for (const [key, target] of Object.entries(rule)) {
    const value = context[key];
    if (typeof target === 'boolean') {
      if (!!value !== target) return false;
    } else if (typeof target === 'number') {
      if ((value || 0) < target) return false;
    }
  }
  return true;
}
```

### 8.2 Understanding Engine (`src/lib/understanding.js`)

```javascript
function calculateUnderstanding({ completedNodes, totalNodes, avgScore, totalCorrect, totalWrong, studyTimeMin }) {
  const Nc = totalNodes > 0 ? completedNodes / totalNodes : 0;
  
  const hasQuizData = avgScore != null && totalNodes > 0;
  const P = hasQuizData ? Math.min(avgScore / 100, 1) : Nc;
  
  const totalAnswered = (totalCorrect || 0) + (totalWrong || 0);
  const Er = totalAnswered > 0 ? totalCorrect / totalAnswered : 1;
  
  const Te = Math.min((studyTimeMin || 0) / 120, 1);
  
  const value = (P * 0.50) + (Nc * 0.25) + (Er * 0.15) + (Te * 0.10);
  
  return {
    value: Math.round(value * 100),
    Nc: Math.round(Nc * 100),
    P: Math.round(P * 100),
    Er: Math.round(Er * 100),
    Te: Math.round(Te * 100),
  };
}
```

---

## 9. Sistema de Notificaciones

### 9.1 Tipos y Triggers

| Tipo | Quién la recibe | Cuándo se dispara | Dónde |
|------|----------------|-------------------|-------|
| `medal` | Estudiante | Al desbloquear un logro | `achievements.js:awardMedal()` |
| `progress` | Estudiante | Al completar un nodo de lección | `Lesson.jsx:handleFinishNode()` |
| `quiz_result` | Estudiante | Al terminar un quiz | `QuizResult.jsx:persist()` |
| `enrollment` | Estudiante | Al inscribirse en un curso | `api.js:enrollStudent()` |
| `new_student` | Docente | Cuando un estudiante se inscribe | `api.js:enrollStudent()` |
| `student_progress` | Docente | Cuando un estudiante completa un nodo | — (pendiente) |
| `inactivity_alert` | Docente | Estudiante inactivo > 5 días | — (pendiente) |
| `child_progress` | Padre | Hijo vinculado completa un nodo | — (pendiente) |
| `child_medal` | Padre | Hijo vinculado gana medalla | — (pendiente) |
| `parent_request` | Estudiante | Padre solicita vinculación | — (pendiente) |
| `parent_linked` | Estudiante | Vinculación aceptada | `api.js:requestParentLink()` |
| `coliseo_result` | Estudiante | Al terminar Coliseo | `Coliseo.jsx:handleVictory()` |

### 9.2 Infraestructura

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Header.jsx)                    │
│                                                       │
│  useEffect → Supabase Realtime channel                │
│    .on('postgres_changes', 'notifications', INSERT)  │
│    → loadNotifications() → setDbNotifs()              │
│                                                       │
│  Polling fallback: loadNotifications() cada 30s       │
│  si Realtime falla (CHANNEL_ERROR / TIMED_OUT)        │
└─────────────────────────────────────────────────────┘
         ▲                           │
         │ RPC bypass RLS            │ INSERT notifications
         ▼                           ▼
┌─────────────────────────────────────────────────────┐
│              Backend (RPC + DB Triggers)              │
│                                                       │
│  insert_notification(user_id, type, payload)          │
│  → SECURITY DEFINER → bypass RLS                     │
│  → cross-user notifications (teacher→student, etc.)  │
└─────────────────────────────────────────────────────┘
```

---

## 10. Variables de Entorno

### 10.1 Frontend (`.env`)

```env
# === Supabase (OBLIGATORIO) ===
VITE_SUPABASE_URL=https://oodijhbtgomlrchrvwzu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# === AI Backend (OPCIONAL, defaults) ===
VITE_AI_BACKEND_URL=http://localhost:3001
VITE_AI_API_KEY=eduapp-dev-key

# === LLM Fallback (OPCIONAL, solo browser directo) ===
VITE_NVIDIA_API_KEY=nvapi-...

# === Deshabilitado (no usar) ===
# VITE_GEMINI_API_KEY=     # No se usa en frontend
```

### 10.2 Edge Functions (Supabase Secrets)

```env
NVIDIA_API_KEY=nvapi-...           # LLM (kimi-k2.6) — OBLIGATORIO
GEMINI_API_KEY=AIza...             # Embeddings (gemini-embedding-001) — OBLIGATORIO
```

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` se inyectan automáticamente.

### 10.3 AI Backend (`ai-backend/`)

```env
# === LLM (al menos uno requerido) ===
NVIDIA_API_KEY=nvapi-...           # LLM principal sin Groq
GROQ_API_KEY=gsk_...               # LLM alternativo + STT (RECOMENDADO)

# === Opcionales ===
AI_BACKEND_PORT=3001               # Default
AI_API_KEY=eduapp-dev-key          # Para producción, cambiar
NODE_ENV=production                # Habilita auth middleware estricto
```

### 10.4 Supabase CLI

```env
SUPABASE_ACCESS_TOKEN=sbp_...      # Personal access token
SUPABASE_PROJECT_ID=oodijhbtgomlrchrvwzu
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 11. Despliegue

### 11.1 Requisitos Previos

- Node.js 18+ (recomendado 20+)
- Supabase CLI (`npx supabase` o instalación global)
- Cuenta NVIDIA AI (API key para LLM)
- Cuenta Google AI Studio (API key para embeddings)
- Cuenta Groq (opcional, para voz + fallback LLM)

### 11.2 Instalación

```bash
# 1. Clonar repositorio
git clone <url>
cd PROYECTO_EDUAPP

# 2. Instalar dependencias
./instalar.bat
# Equivalente manual:
# npm install
# cd ai-backend && npm install && cd ..

# 3. Configurar .env (copiar template, completar variables)
```

### 11.3 Inicio Local

```bash
# Opción 1: Script todo-en-uno
./iniciar.bat
# Levanta: Supabase local + Edge Functions + AI Backend + Vite

# Opción 2: Componentes individuales
npm run dev                         # Frontend → :5173
cd ai-backend && npm run dev        # AI Backend → :3001
npx supabase start                  # Supabase local
npx supabase functions serve        # Edge Functions locales
```

### 11.4 Despliegue a Producción

```bash
# 1. Deploy Edge Functions
npx supabase functions deploy chat
npx supabase functions deploy generate-lesson
npx supabase functions deploy generate-quiz
npx supabase functions deploy generate-roadmap
npx supabase functions deploy generate-coliseo
npx supabase functions deploy generate-test
npx supabase functions deploy generate-course-content
npx supabase functions deploy generate-medal-svg
npx supabase functions deploy chat-roadmap
npx supabase functions deploy analyze-error
npx supabase functions deploy reinforce
npx supabase functions deploy register-user
npx supabase functions deploy upload-source
npx supabase functions deploy embed-source
npx supabase functions deploy youtube-transcript

# 2. Push migrations
npx supabase db push

# 3. Build frontend
npm run build                       # → dist/

# 4. Deploy frontend (ej: Vercel, Netlify, Cloudflare Pages)
# Variables de entorno requeridas en el deploy:
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 5. Deploy AI Backend (ej: Railway, Render, Fly.io)
# Variables: NVIDIA_API_KEY, GROQ_API_KEY (opcional), AI_API_KEY
```

---

## 12. Testing

### 12.1 Scripts de Testing (`scripts/`)

| Script | Propósito | Cómo ejecutar |
|--------|-----------|---------------|
| `test-e2e-teacher-student.mjs` | Flujo E2E: docente crea curso, estudiante se inscribe | `node scripts/test-e2e-teacher-student.mjs` |
| `test-chat.mjs` | Edge Function `chat` con RAG | `node scripts/test-chat.mjs` |
| `test-roadmap.mjs` | Edge Function `generate-roadmap` | `node scripts/test-roadmap.mjs` |
| `test-roadmap-api.mjs` | AI Backend `/api/roadmap` | `node scripts/test-roadmap-api.mjs` |
| `test-roadmap-direct.mjs` | NVIDIA API directa (sin backend) | `node scripts/test-roadmap-direct.mjs` |
| `test-quiz-quality.mjs` | Calidad de quizzes generados | `node scripts/test-quiz-quality.mjs` |
| `test-quiz-review-api.mjs` | AI Backend analyze-error batch | `node scripts/test-quiz-review-api.mjs` |
| `test-quiz-review-flow.mjs` | Flujo quiz → review | `node scripts/test-quiz-review-flow.mjs` |
| `test-search.mjs` | Búsqueda semántica RAG | `node scripts/test-search.mjs` |
| `test-search-specific.mjs` | Búsqueda específica | `node scripts/test-search-specific.mjs` |
| `test-nvidia.mjs` | NVIDIA API básica | `node scripts/test-nvidia.mjs` |
| `test-nvidia-full.mjs` | NVIDIA API detallada | `node scripts/test-nvidia-full.mjs` |
| `test-nvidia-quick.mjs` | NVIDIA API rápida | `node scripts/test-nvidia-quick.mjs` |
| `test-enrollment-flow.mjs` | Flujo de inscripción | `node scripts/test-enrollment-flow.mjs` |
| `test-progress-persistence.mjs` | Persistencia de progreso | `node scripts/test-progress-persistence.mjs` |
| `test-teacher-flow.mjs` | Flujo docente completo | `node scripts/test-teacher-flow.mjs` |
| `test-truncated.mjs` | Contenido truncado | `node scripts/test-truncated.mjs` |
| `test-notifications.mjs` | Sistema de notificaciones | `node scripts/test-notifications.mjs` |
| `test-ai-roadmap.mjs` | AI Backend roadmap alternativo | `node scripts/test-ai-roadmap.mjs` |
| `seed-test-users.mjs` | Seed 3 cuentas base | `node scripts/seed-test-users.mjs` |
| `seed-test-accounts.mjs` | Seed 11 cuentas adicionales | `node scripts/seed-test-accounts.mjs` |
| `seed-material.mjs` | Seed material de ejemplo | `node scripts/seed-material.mjs` |

### 12.2 Tests Manuales Sugeridos

```bash
# 1. Verificar Edge Functions
curl -X POST https://oodijhbtgomlrchrvwzu.supabase.co/functions/v1/health

# 2. Verificar AI Backend
curl http://localhost:3001/api/health

# 3. Verificar streaming
curl -N -X POST http://localhost:3001/api/ask-stream \
  -H "Content-Type: application/json" \
  -d '{"question":"¿Qué es la fotosíntesis?"}'

# 4. Verificar STT
curl -X POST http://localhost:3001/api/voice/transcribe \
  -F "audio=@test-audio.webm"
```

---

## 13. Troubleshooting

### 13.1 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Supabase no está configurado` | Faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` en `.env` | Completar variables y reiniciar Vite |
| `Invalid login credentials` | Email o contraseña incorrectos | Verificar credenciales. Usar cuentas de prueba |
| `Email not confirmed` | Cuenta no verificada | Revisar bandeja de entrada o usar `register-user` |
| `Error 429: rate limited` | Demasiadas solicitudes a NVIDIA | Esperar 60s. Configurar `GROQ_API_KEY` como alternativo |
| `Edge Function 500` | Error en Edge Function | Revisar logs de Supabase. Verificar API keys |
| `generate-roadmap falló` | Material insuficiente (< 50 chars) o formato inválido | Subir más contenido (mín. 500 palabras recomendadas) |
| `Voice: mic access denied` | Permiso de micrófono denegado | Permitir acceso en el browser / HTTPS requerido |
| `Groq STT error` | `GROQ_API_KEY` no configurada o sin crédito | Configurar variable en `ai-backend/` |
| `NVIDIA error 500` | Problema temporal del proveedor | Reintentar. El sistema tiene retry automático (3 intentos) |

### 13.2 Logs

```bash
# Frontend: console en DevTools
# AI Backend: stdout con formato [HH:MM:SS][TAG] mensaje
# Edge Functions: Supabase Dashboard > Edge Functions > Logs
# Supabase local: npx supabase status
```

### 13.3 Debugging de Voz

```javascript
// Forzar comando en consola:
const result = await categorize('ir al dashboard', { page: 'dashboard' });
console.log(result);
// { category: 'navigate', action: 'goToDashboard', params: {}, responseText: '...' }

// Verificar nivel de audio:
const level = await getAudioLevel();
console.log('RMS:', level);  // > 0.015 = detectando voz
```

---

## 14. Glosario Técnico

| Término | Definición |
|---------|-----------|
| **Roadmap** | Camino de aprendizaje visual (SVG serpiente) con nodos secuenciales (theory → quiz → theory → ... → boss) |
| **Nodo** | Unidad de contenido atómica: `theory` (lección), `quiz` (evaluación), `practice` (ejercicio), `boss` (examen final), `reward` (medalla) |
| **RAG** | Retrieval-Augmented Generation — búsqueda semántica vectorial para contextualizar al LLM con el material del curso |
| **Embedding** | Vector numérico de 768 dimensiones que representa semánticamente un texto. Generado por `gemini-embedding-001` |
| **pgvector** | Extensión de Postgres para almacenamiento y búsqueda de vectores (producto punto, cosine distance, L2) |
| **Coliseo** | Examen final integrador con sistema de vidas (❤️❤️❤️), dificultad adaptativa, y ceremonia de finalización |
| **Sincronía** | Nivel de entendimiento calculado con la fórmula `S = P×0.50 + Nc×0.25 + Er×0.15 + Te×0.10` |
| **Streaming SSE** | Server-Sent Events — transmisión de texto en tiempo real desde el LLM al frontend |
| **Edge Function** | Función serverless en Supabase (Deno/TypeScript) que ejecuta lógica de backend con IA |
| **RLS** | Row Level Security — seguridad a nivel de fila en Postgres que restringe acceso según el usuario autenticado |
| **STT** | Speech-to-Text — conversión de audio a texto (Groq whisper-large-v3) |
| **TTS** | Text-to-Speech — conversión de texto a voz (Web Speech API) |
| **SSE** | Server-Sent Events — protocolo HTTP para streaming unidireccional |
| **RPC** | Remote Procedure Call — función SQL ejecutada vía API (ej: `insert_notification`) |
| **HashRouter** | Router de React que usa el hash (`#/ruta`) en vez de History API — compatible con hosting estático |
| **DOMPurify** | Librería de sanitización HTML que previene XSS en contenido generado por IA |

---
