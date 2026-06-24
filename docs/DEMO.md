# EduApp — Datos por defecto (Demo)

> Última actualización: 24/06/2026 — Proyecto `oodijhbtgomlrchrvwzu` (Supabase, West US / Oregon).

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

---

## 2. Scripts de utilidad

| Script | Qué hace |
|---|---|
| `scripts/seed-test-users.mjs` | Crea/actualiza las 3 cuentas base (student/teacher/parent) |
| `scripts/seed-test-accounts.mjs` | Crea 11 cuentas adicionales (2 prof, 5 est, 4 padres) + vinculaciones |
| `scripts/test-e2e-teacher-student.mjs` | Verifica flujo docente → alumno → roadmap |
| `scripts/test-chat.mjs` | Verifica Edge Function `chat` con RAG |
| `scripts/test-roadmap.mjs` | Verifica Edge Function `generate-roadmap` |

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

---

## 4. Edge Functions

Todas en `https://oodijhbtgomlrchrvwzu.supabase.co/functions/v1/<nombre>`.

| Función               | Uso                                          |
|-----------------------|----------------------------------------------|
| `register-user`       | Crear cuenta (simula verificación email)     |
| `embed-source`        | Procesar PDF/DOCX y generar embeddings       |
| `chat`                | Chat RAG con streaming (Gemini 2.5 Flash)    |
| `generate-lesson`     | Generar contenido de una lección             |
| `generate-quiz`       | Generar quiz para un nodo                    |
| `generate-test`       | Generar examen completo                      |
| `generate-coliseo`    | Generar desafío del Coliseo                  |
| `generate-roadmap`    | Generar roadmap completo con regulación      |
| `analyze-error`       | Analizar errores del estudiante              |
| `reinforce`           | Refuerzo con material adicional              |
| `youtube-transcript`  | Transcripción de YouTube                    |
| `generate-medal-svg`  | Generar SVG de medalla                       |

---

## 7. Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=https://oodijhbtgomlrchrvwzu.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_PROJECT_ID=oodijhbtgomlrchrvwzu
SUPABASE_ACCESS_TOKEN=<personal_access_token>
GEMINI_API_KEY=<gemini_api_key>
```

---

## 8. Reinicio rápido

```bash
# Instalar dependencias + supabase CLI
./instalar.bat

# Iniciar app (link + push + secrets + deploy + seed + dev)
./iniciar.bat
```
