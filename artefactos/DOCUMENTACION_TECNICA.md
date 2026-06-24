# EduApp — Documentación Técnica

> Para el equipo de desarrollo. Complementa `DOCUMENTACION_CLIENTE.md`.

---

## 1. Estructura de Archivos

```
PROYECTO_EDUAPP/
├── src/
│   ├── components/          # 7 componentes reutilizables
│   │   ├── Header.jsx/.css         # Barra de navegación + notificaciones
│   │   ├── Mascot.jsx/.css         # Mascota animada (dragón/robot/búho)
│   │   ├── PageWrapper.jsx         # Contenedor con transiciones framer-motion
│   │   ├── StarsBackground.jsx     # Fondo animado de estrellas
│   │   ├── CourseCreateModal.jsx   # Modal de creación de curso (3 pasos)
│   │   ├── CourseDetailModal.jsx   # Modal de detalle (participantes, alertas)
│   │   └── VoiceIndicator.jsx      # Indicador flotante de micrófono
│   ├── context/
│   │   ├── AuthContext.jsx         # Estado global de autenticación
│   │   └── VoiceContext.jsx        # Web Speech API + comandos de voz
│   ├── lib/                       # 13 utilidades
│   │   ├── supabase.js            # Cliente Supabase + helpers de sesión
│   │   ├── api.js                 # ~30 funciones CRUD a Supabase
│   │   ├── llm.js                 # Wrappers de Edge Functions (15 llamadas)
│   │   ├── streaming.js           # Helpers SSE para streaming
│   │   ├── gemini.js              # Llamadas directas NVIDIA (nombre engañoso)
│   │   ├── ai-client.js           # Proxy al ai-backend Express
│   │   ├── sanitize.js            # DOMPurify para contenido IA
│   │   ├── markdown.js            # Renderizado de lecciones con marked
│   │   ├── understanding.js       # Cálculo del nivel de entendimiento
│   │   ├── achievements.js        # Sistema de logros y medallas
│   │   ├── notifications.js       # Helper de notificaciones
│   │   ├── voice-commands.js      # Textos de ayuda por página
│   │   └── voice.js               # Web Speech API (reconocimiento + TTS)
│   ├── pages/                     # 20 páginas (JSX + CSS)
│   ├── utils/
│   │   ├── sounds.js              # Web Audio API (sonidos de UI)
│   │   └── vibration.js           # Vibration API (feedback háptico)
│   ├── data/
│   │   └── achievements.json      # Catálogo de 18 logros
│   ├── App.jsx                    # HashRouter + rutas + ProtectedRoute
│   ├── App.css
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Variables CSS globales + reset
│
├── supabase/
│   ├── functions/                 # 15 Edge Functions (Deno/TypeScript)
│   │   ├── _shared/               # Utilidades compartidas
│   │   │   ├── llm.ts             # Wrapper NVIDIA API
│   │   │   ├── embeddings.ts      # Wrapper Gemini embeddings
│   │   │   ├── supabase-admin.ts  # Clientes Supabase (service_role + user)
│   │   │   ├── cors.ts            # Headers CORS
│   │   │   ├── chunker.ts         # División de texto (1200 chars, overlap 200)
│   │   │   ├── extractors/        # pdf.ts, docx.ts, txt.ts, youtube.ts
│   │   │   └── prompts/           # System prompts por función
│   │   └── [funcion]/index.ts     # Cada Edge Function (15 carpetas)
│   ├── migrations/                # 8 migraciones SQL
│   └── config.toml                # Configuración de Supabase CLI
│
├── ai-backend/                    # Express.js auxiliar
│   └── server.js                  # Proxy streaming + clasificación de voz
│
├── scripts/                       # Scripts de testing (.mjs)
├── docs/                          # Documentación del proyecto
│   ├── ARCHITECTURE.md            # Arquitectura técnica detallada
│   ├── SPEC.md                    # 31 requerimientos funcionales
│   ├── DESIGN.md                  # Sistema de diseño UI
│   ├── DEMO.md                    # Cuentas de prueba, scripts
│   └── STATUS.md                  # Estado actual, deuda técnica
└── artefactos/                    # Documentación para cliente
```

---

## 2. Convenciones de Código

### Frontend (React/JS)
- **NO TypeScript** — JavaScript puro con JSX
- **Functional components** con hooks ✅ | Class components ❌
- **Imports**: Named imports de librerías
- **CSS**: Un archivo por componente, clases BEM-like, variables CSS de `index.css`
- **Supabase**: Siempre a través de `src/lib/supabase.js` y `src/lib/api.js`

### Edge Functions (Deno/TypeScript)
- Cada función en carpeta propia con `index.ts`
- Siempre usar `_shared/cors.ts` para CORS
- Siempre autenticar con `getUserClient(req).auth.getUser(token)`
- LLM: usar `callLlm()` de `_shared/llm.ts`
- Embeddings: usar `embedQuery()` / `embedTexts()` de `_shared/embeddings.ts`

### Diseño UI
- Sistema editorial dark: fondo `#0A0A14`, superficie `#151518`
- **PROHIBIDO**: `backdrop-filter: blur()`, clase `.card` global, `var(--shadow-emerald)`, `var(--shadow-glow)`
- **USAR**: `var(--surface)` para fondos sólidos, `::before` con gradiente overlay en cada card
- Ver `docs/DESIGN.md` para el sistema completo

---

## 3. Base de Datos — Esquema Completo

### Tablas y columnas

```sql
-- profiles: extiende auth.users
profiles (
  id uuid PK → auth.users(id) CASCADE,
  role text CHECK (student, teacher, parent, admin),
  full_name text, email text, age_band text,
  institution text, subject text, relation text,
  avatar_id int, pet_type text CHECK (dragon, robot, owl),
  pet_name text, pet_xp int DEFAULT 0,
  accessibility_settings jsonb DEFAULT '{}',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz, updated_at timestamptz
)

-- courses: cursos creados por docentes
courses (
  id uuid PK DEFAULT gen_random_uuid(),
  teacher_id uuid FK → profiles(id) CASCADE,
  title text NOT NULL, description text,
  category text, level text, cover_url text, cover_color text,
  status text DEFAULT draft CHECK (draft, published, archived),
  rigor int DEFAULT 3 CHECK (1-5),
  invite_code text UNIQUE, invite_token text UNIQUE,
  created_at timestamptz, updated_at timestamptz
)

-- nodes: nodos del roadmap
nodes (
  id uuid PK DEFAULT gen_random_uuid(),
  course_id uuid FK → courses(id) CASCADE,
  position int NOT NULL,
  type text CHECK (theory, practice, quiz, boss, reward),
  title text NOT NULL, description text, content text,
  status text DEFAULT pending_review CHECK (pending_review, published),
  created_at timestamptz, updated_at timestamptz,
  UNIQUE (course_id, position)
)

-- enrollments: inscripciones
enrollments (
  id uuid PK DEFAULT gen_random_uuid(),
  student_id uuid FK → profiles(id) CASCADE,
  course_id uuid FK → courses(id) CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  ai_interactions int DEFAULT 0,
  study_time_sec int DEFAULT 0,
  UNIQUE (student_id, course_id)
)

-- progress: progreso por nodo
progress (
  id uuid PK DEFAULT gen_random_uuid(),
  enrollment_id uuid FK → enrollments(id) CASCADE,
  node_id uuid FK → nodes(id) CASCADE,
  state text CHECK (locked, available, in_progress, completed),
  score int, attempts int DEFAULT 0,
  completed_at timestamptz,
  UNIQUE (enrollment_id, node_id)
)

-- source_files: archivos subidos por docentes
source_files (
  id uuid PK DEFAULT gen_random_uuid(),
  course_id uuid FK → courses(id) CASCADE,
  filename text, file_type text, file_url text,
  status text DEFAULT uploading,
  chunks_count int, error_message text,
  created_at timestamptz
)

-- documents: chunks RAG con embeddings vectoriales
documents (
  id uuid PK DEFAULT gen_random_uuid(),
  course_id uuid FK → courses(id) CASCADE,
  source_id uuid FK → source_files(id) CASCADE,
  content text, chunk_index int,
  embedding vector(768),  -- gemini-embedding-001: 768 dimensiones
  metadata jsonb DEFAULT '{}',
  created_at timestamptz
)

-- weaknesses: matriz de debilidades
weaknesses (
  id uuid PK DEFAULT gen_random_uuid(),
  student_id uuid FK → profiles(id) CASCADE,
  course_id uuid FK → courses(id) CASCADE,
  concept text, is_error boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- medals: medallas obtenidas
medals (
  id uuid PK DEFAULT gen_random_uuid(),
  student_id uuid FK → profiles(id) CASCADE,
  medal_type text, name text, achievement text,
  rarity text, description text, svg_url text,
  unlocked_at timestamptz DEFAULT now()
)

-- notifications: notificaciones in-app
notifications (
  id uuid PK DEFAULT gen_random_uuid(),
  user_id uuid FK → profiles(id) CASCADE,
  type text CHECK (parent_request, alert, medal, message, progress,
                   quiz_result, enrollment, new_student, student_progress,
                   inactivity_alert, child_progress, child_medal, coliseo_result),
  payload jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- parent_links: vinculación padre-estudiante
parent_links (
  id uuid PK DEFAULT gen_random_uuid(),
  parent_id uuid FK → profiles(id) CASCADE,
  student_id uuid FK → profiles(id) CASCADE,
  status text CHECK (pending, accepted, rejected),
  created_at timestamptz DEFAULT now()
)
```

### Políticas RLS (Row Level Security)

Todas las tablas tienen RLS habilitado. Cada usuario solo puede acceder a sus propios datos:
- `profiles`: SELECT/UPDATE propio
- `courses`: SELECT público (published), CRUD teacher dueño
- `nodes`: SELECT público (published), CRUD teacher dueño
- `enrollments`: SELECT propio (student/parent/teacher)
- `progress`: SELECT/INSERT/UPDATE según enrollment
- `notifications`: SELECT/INSERT/UPDATE propio
- `parent_links`: SELECT/INSERT propio

---

## 4. Variables de Entorno

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://oodijhbtgomlrchrvwzu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_NVIDIA_API_KEY=nvapi-...
```

### Edge Functions (Supabase secrets)
```env
NVIDIA_API_KEY=nvapi-...
GEMINI_API_KEY=AIza...
```

### Backend auxiliar (`ai-backend/`)
```env
NVIDIA_API_KEY=nvapi-...
```

---

## 5. Comandos Útiles

```bash
# Instalar dependencias
./instalar.bat

# Iniciar todo (Supabase + Edge Functions + AI Backend + Vite)
./iniciar.bat

# Solo Frontend
npm run dev

# Solo AI Backend
cd ai-backend && npm run dev

# Build producción
npm run build

# Deploy Edge Function
npx supabase functions deploy <nombre-funcion>

# Push migraciones
npx supabase db push

# Seed datos demo
node scripts/seed-test-users.mjs

# Test E2E
node scripts/test-e2e-teacher-student.mjs
```

---

## 6. Sistema de Notificaciones

### Tipos de notificación y triggers

| Tipo | Quién la recibe | Cuándo se dispara |
|------|----------------|-------------------|
| `medal` | Estudiante | Al desbloquear un logro (`checkAchievements`) |
| `progress` | Estudiante | Al completar un nodo de lección |
| `quiz_result` | Estudiante | Al terminar un quiz (aprobado/reprobado) |
| `enrollment` | Estudiante | Al inscribirse en un curso |
| `new_student` | Docente | Cuando un estudiante se inscribe en su curso |
| `student_progress` | Docente | Cuando un estudiante completa un nodo |
| `inactivity_alert` | Docente | Cuando un estudiante está inactivo > 5 días |
| `child_progress` | Padre | Cuando su hijo vinculado completa un nodo |
| `child_medal` | Padre | Cuando su hijo vinculado gana una medalla |
| `parent_request` | Estudiante | Cuando un padre solicita vinculación |
| `coliseo_result` | Estudiante | Al terminar el Coliseo |

### Infraestructura
- **Polling**: Cada 30 segundos en el Header
- **Realtime**: Suscripción Supabase Realtime para notificaciones instantáneas
- **Badge**: Muestra solo no leídas (punto rojo)
- **Voice**: "Leer notificaciones" — TTS lee las 3 más recientes

---

## 7. Glosario

| Término | Definición |
|---------|-----------|
| **Roadmap** | Camino de aprendizaje visual (SVG) con nodos secuenciales |
| **Nodo** | Unidad de contenido: theory (lección), quiz, practice, boss (examen), reward |
| **RAG** | Retrieval-Augmented Generation — búsqueda semántica para contextualizar al LLM |
| **Embedding** | Vector numérico (768 dims) que representa semánticamente un texto |
| **Coliseo** | Examen final integrador con sistema de vidas |
| **Sincronía** | Nivel de entendimiento calculado con la fórmula S = P×0.50 + Nc×0.25 + Er×0.15 + Te×0.10 |
| **XP** | Puntos de experiencia que suben el nivel de la mascota |
| **Streaming** | Transmisión de texto en tiempo real desde el LLM (Server-Sent Events) |
| **Edge Function** | Función serverless en Supabase (Deno/TypeScript) que ejecuta lógica de backend |
| **RLS** | Row Level Security — seguridad a nivel de fila en Postgres |
