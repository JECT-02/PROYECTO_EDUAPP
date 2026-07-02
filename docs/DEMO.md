# EduApp — Datos por defecto (Demo)

> Última actualización: 02/07/2026 — Proyecto `oodijhbtgomlrchrvwzu` (Supabase, West US / Oregon).

---

## 1. Cuentas de prueba

Se crean con `node scripts/seed-test-users.mjs` (cuentas base) y `node scripts/seed-test-accounts.mjs` (cuentas adicionales).

### Profesores (2 + 1 base)

| Email | Contraseña | DNI | Nombre | Materia |
|---|---|---|---|---|
| `default_teacher@eduapp.test` | `teacher123` | 22222222 | Docente Demo | Biología |
| `maria.lopez@eduapp.test` | `teacher123` | 44444444 | Prof. María López | Matemáticas |
| `carlos.ruiz@eduapp.test` | `teacher123` | 55555555 | Prof. Carlos Ruiz | Historia |

### Estudiantes (5 + 1 base)

| Email | Contraseña | DNI | Nombre | Edad |
|---|---|---|---|---|
| `default_student@eduapp.test` | `student123` | 11111111 | Estudiante Demo | 11-14 |
| `ana.garcia@eduapp.test` | `student123` | 66666666 | Ana García | 15-17 |
| `luis.martinez@eduapp.test` | `student123` | 77777777 | Luis Martínez | 11-14 |
| `sofia.torres@eduapp.test` | `student123` | 88888888 | Sofía Torres | 15-17 |
| `diego.vargas@eduapp.test` | `student123` | 99999999 | Diego Vargas | 18+ |
| `valeria.rios@eduapp.test` | `student123` | 10101010 | Valeria Ríos | 11-14 |

### Padres (4 + 1 base) — Sin vincular inicialmente

| Email | Contraseña | DNI | Nombre |
|---|---|---|---|
| `default_parent@eduapp.test` | `parent123` | 33333333 | Padre/Madre Demo |
| `padre.garcia@eduapp.test` | `parent123` | 11000001 | Sr. García |
| `padre.martinez@eduapp.test` | `parent123` | 11000002 | Sr. Martínez |
| `madre.torres@eduapp.test` | `parent123` | 11000003 | Sra. Torres |
| `padre.vargas@eduapp.test` | `parent123` | 11000004 | Sr. Vargas |

> Los padres y estudiantes se crean **sin vínculos previos**. El padre debe vincular manualmente a su hijo ingresando el DNI desde el Panel Familiar.

### Login rápido desde la UI

En `src/pages/Login.jsx` hay un `<details>` con **"Cuentas de prueba"** que rellena los campos automáticamente (solo las 3 cuentas base).

---

## 2. Scripts de utilidad

### 2.1 Scripts de seed (datos iniciales)

| Script | Qué hace |
|---|---|
| `seed-test-users.mjs` | Crea/actualiza las 3 cuentas base (student/teacher/parent) |
| `seed-test-accounts.mjs` | Crea 11 cuentas adicionales (2 prof, 5 est, 4 padres) + vinculaciones |

### 2.2 Scripts de testing

| Script | Qué hace |
|---|---|
| `test-e2e-teacher-student.mjs` | Verifica flujo docente → alumno → roadmap |
| `test-chat.mjs` | Verifica Edge Function `chat` con RAG |
| `test-roadmap.mjs` | Verifica Edge Function `generate-roadmap` |
| `test-nvidia-full.mjs` | Test completo de NVIDIA API |
| `test-nvidia-quick.mjs` | Test rápido de NVIDIA API |
| `test-nvidia.mjs` | Test básico de NVIDIA API |
| `test-quiz-quality.mjs` | Verifica calidad de quizzes generados |
| `test-quiz-review-api.mjs` | Test API de revisión de quizzes |
| `test-quiz-review-flow.mjs` | Test flujo de revisión de quizzes |
| `test-roadmap-api.mjs` | Test API de roadmaps |
| `test-roadmap-direct.mjs` | Test directo de roadmaps |
| `test-search.mjs` | Test de búsqueda |
| `test-search-specific.mjs` | Test de búsqueda específica |
| `test-enrollment-flow.mjs` | Test de flujo de inscripción |
| `test-notifications.mjs` | Test de notificaciones |
| `test-or-filter.mjs` | Test de filtros OR |

---

## 3. Flujo end-to-end

### `profiles`
Campos personalizados:
- `dni` — DNI del usuario (texto).
- `email` — sincronizado con `auth.users.email`.
- `password` — **DEMO ONLY** — texto plano, visible desde la app (no se usa para auth).
- `institution_short` — alias corto de la institución.
- `role` — `student` | `teacher` | `parent`.

### `courses`
- `id`, `teacher_id`, `title`, `description`, `category`, `level`, `rigor`, `status` (`draft`/`published`/`archived`), `invite_code`, `invite_token`, `cover_color`, `cover_url`, `created_at`.

### `enrollments`
- `id`, `student_id`, `course_id`, `enrolled_at` (UNIQUE `(student_id, course_id)`).
- RLS: el estudiante ve sus enrollments; el docente ve los de sus cursos; el padre ve los de los estudiantes vinculados.

### `progress`
- `id`, `enrollment_id`, `node_id`, `state` (`locked`/`available`/`in_progress`/`completed`), `score`, `attempts`, `completed_at`.
- Persiste el avance del estudiante en cada nodo del roadmap.

### `nodes`
- `id`, `course_id`, `position`, `type` (`theory`/`quiz`/`practice`/`reward`/`boss`), `title`, `description`, `content`, `quiz_data` (jsonb), `status` (`draft`/`pending_review`/`published`/`archived`).
- RLS: solo nodos `published` visibles para estudiantes.

### `notifications`
- `id`, `user_id`, `type` (14 tipos válidos), `payload` (jsonb), `read`, `created_at`.
- Realtime habilitado para INSERT/UPDATE/DELETE.
- RPC `insert_notification()` para cross-user notifications.

### `medals`
- `id`, `student_id`, `medal_type`, `name`, `achievement`, `rarity`, `description`, `unlocked_at`.
- 18 logros en catálogo (12 mastery + 6 behavior).

---

## 4. Edge Functions

Todas en `https://oodijhbtgomlrchrvwzu.supabase.co/functions/v1/<nombre>`.

| Función | Uso |
|---|---|
| `register-user` | Crear cuenta (simula verificación email) |
| `embed-source` | Procesar PDF/DOCX y generar embeddings |
| `chat` | Chat RAG con streaming (NVIDIA Kimi K2.6) |
| `generate-lesson` | Generar contenido de una lección |
| `generate-quiz` | Generar quiz para un nodo |
| `generate-test` | Generar examen completo |
| `generate-coliseo` | Generar desafío del Coliseo |
| `generate-roadmap` | Generar roadmap completo con regulación |
| `analyze-error` | Analizar errores del estudiante |
| `reinforce` | Refuerzo con material adicional |
| `youtube-transcript` | Transcripción de YouTube |
| `generate-medal-svg` | Generar SVG de medalla |
| `chat-roadmap` | Asistente IA para docente (editar roadmap) |
| `generate-course-content` | Generar contenido en lote para nodos |
| `upload-source` | Subir archivo fuente a Storage |

---

## 5. Backend auxiliar (ai-backend)

Endpoints disponibles en `http://localhost:3001`:

| Endpoint | Método | Uso |
|---|---|---|
| `/api/transcribe` | POST | STT: audio → texto (Groq Whisper) |
| `/api/categorize` | POST | Clasificar intención de voz (Groq LLaMA) |
| `/api/ask` | POST | Preguntas libres al tutor IA (NVIDIA Kimi) |
| `/api/health` | GET | Health check |

---

## 6. Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=https://oodijhbtgomlrchrvwzu.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_NVIDIA_API_KEY=nvapi-...          # Fallback directo desde browser
VITE_AI_BACKEND_URL=http://localhost:3001  # URL del ai-backend
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_PROJECT_ID=oodijhbtgomlrchrvwzu
SUPABASE_ACCESS_TOKEN=<personal_access_token>
GEMINI_API_KEY=<gemini_api_key>        # Embeddings (RAG)
GROQ_API_KEY=gsk_...                   # STT + Clasificación voz
```

---

## 7. Despliegue

### Frontend (Vercel)
- Configurado en `vercel.json`
- Build: `npm run build`
- Output: `dist/`

### AI Backend (Render)
- Configurado en `render.yaml`
- Runtime: Node.js
- Puerto: 3001

### Edge Functions (Supabase)
- Deploy: `supabase functions deploy`
- Secrets: `supabase secrets set`

---

## 8. Reinicio rápido

```bash
# Instalar dependencias + supabase CLI
./instalar.bat

# Iniciar app (link + push + secrets + deploy + seed + dev)
./iniciar.bat
```
