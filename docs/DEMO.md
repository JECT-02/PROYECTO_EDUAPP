# EduApp — Datos por defecto (Demo)

> Última actualización: 02/06/2026 — Proyecto `oodijhbtgomlrchrvwzu` (Supabase, West US / Oregon).

Esta guía resume todo lo que necesitas saber para entrar a la app y probar el flujo end-to-end (docente → curso → alumno → roadmap → progreso persistente).

---

## 1. Cuentas de prueba (ya creadas en Supabase)

Se crean automáticamente al ejecutar `node scripts/seed-test-users.mjs`.

| Rol         | Email                              | Contraseña   | DNI        | Nombre             |
|-------------|------------------------------------|--------------|------------|--------------------|
| Estudiante  | `default_student@eduapp.test`      | `student123` | 11111111   | Estudiante Demo    |
| Docente     | `default_teacher@eduapp.test`      | `teacher123` | 22222222   | Docente Demo       |
| Padre/Madre | `default_parent@eduapp.test`       | `parent123`  | 33333333   | Padre/Madre Demo   |

> El padre ya está vinculado al estudiante (`parent_links.status = 'accepted'`).

### Login rápido desde la UI

En `src/pages/Login.jsx` hay un `<details>` con **"Cuentas de prueba"** que rellena los campos automáticamente.

---

## 2. Curso demo

| Campo         | Valor                          |
|---------------|--------------------------------|
| Título        | Biología Celular (Demo)        |
| Materia       | Biología                       |
| Código        | `DEMO01`                       |
| Estado        | `published`                    |
| Nodos         | 12 (auto-generados por IA)     |
| Progreso      | El estudiante ya está inscrito |

Los nodos se republican automáticamente cada vez que se ejecuta el seed.

---

## 3. Flujo end-to-end verificado (manual + automatizado)

### 3.1 Manual
1. Login como **docente** (`default_teacher@eduapp.test` / `teacher123`).
2. Ir a "Panel docente" → **Crear nuevo curso**.
3. Rellenar nombre, materia, descripción, rigor, etc.
4. (Opcional) Subir un PDF — la IA lo procesa y crea los nodos del roadmap.
5. Al terminar, el modal muestra el **código de invitación** (ej. `BIOL2026`).
6. Abrir el curso recién creado desde el listado → **Agregar alumno** (DNI o email).
7. Login como **estudiante** (`default_student@eduapp.test` / `student123`).
8. El curso aparece en el dashboard y se puede entrar al roadmap.

### 3.2 Automatizado
```bash
node scripts/test-e2e-teacher-student.mjs
```
El script:
1. Login docente.
2. Crea un curso nuevo vía REST.
3. Inscribe al estudiante por email (crea fila en `enrollments`).
4. Login estudiante.
5. Verifica que el curso aparece en su `enrollments`.
6. Verifica que el roadmap del curso es accesible (`getCourseNodes`).

---

## 4. Scripts de utilidad

| Script                                | Qué hace                                                 |
|---------------------------------------|----------------------------------------------------------|
| `scripts/seed-test-users.mjs`         | Crea/actualiza los 3 usuarios + curso DEMO01 + nodos     |
| `scripts/test-progress-persistence.mjs` | Verifica que el `progress` persiste tras logout/login  |
| `scripts/test-e2e-teacher-student.mjs` | Verifica flujo docente → alumno → roadmap              |
| `scripts/test-chat.mjs`               | Verifica Edge Function `chat` con RAG                    |
| `scripts/test-roadmap.mjs`            | Verifica Edge Function `generate-roadmap` (regulación)   |

---

## 5. Estructura de tablas clave

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

## 6. Edge Functions desplegadas (12)

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
