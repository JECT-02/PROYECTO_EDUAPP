# EduApp — Arquitectura Técnica

> Documento vivo. Última actualización: 20/06/2026.

---

## 1. Stack actual

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + Vite | React 19.2.5, Vite 8.0.10 |
| Routing | react-router-dom | 7.15.0 |
| Animaciones | framer-motion | 12.38.0 |
| Iconos | lucide-react | 1.14.0 |
| Gráficos | recharts | 3.8.1 |
| Sanitización | DOMPurify | 3.4.7 |
| Backend (BaaS) | Supabase | Postgres, Auth, Storage, Edge Functions, pgvector, Realtime |
| LLM (texto) | NVIDIA AI — `moonshotai/kimi-k2.6` | API OpenAI-compatible |
| Embeddings | Google Gemini — `gemini-embedding-001` | 768 dimensiones |
| Backend auxiliar | Express.js | 4.21 (`ai-backend/`) |

### 1.1 Proveedores de IA

| Proveedor | Modelo | Uso | Endpoint |
|-----------|--------|-----|----------|
| **NVIDIA AI** | `moonshotai/kimi-k2.6` | Todo el texto: chat, lecciones, quizzes, roadmaps, análisis de errores, medallas | `integrate.api.nvidia.com/v1/chat/completions` |
| **Google AI** | `gemini-embedding-001` | Embeddings vectoriales para RAG (búsqueda semántica) | `generativelanguage.googleapis.com/v1beta/models/...` |

> **IMPORTANTE:** El LLM NO es Gemini. El archivo `src/lib/gemini.js` tiene un nombre engañoso — internamente llama a NVIDIA/Kimi.

---

## 2. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite)                        │
│                                                           │
│  src/lib/llm.js ──────────────► Edge Functions (fetch)   │
│  src/lib/ai-client.js ────────► ai-backend (Express)     │
│  src/lib/gemini.js ───────────► NVIDIA API (directo)     │
│  src/lib/supabase.js ─────────► Supabase BaaS            │
└────────┬────────────────────────────┬────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────┐    ┌──────────────────────────┐
│  SUPABASE (BaaS)    │    │  EDGE FUNCTIONS (Deno)    │
│                      │    │                            │
│  • Auth              │    │  15 funciones serverless   │
│  • Postgres + pgvector│   │  • Lógica de IA            │
│  • Storage            │   │  • Embeddings RAG          │
│  • Realtime           │   │  • Procesamiento archivos  │
│  • RLS                │   │                            │
└──────────────────────┘    └──────────┬─────────────────┘
                                       │
                  ┌────────────────────┤
                  ▼                    ▼
     ┌──────────────────┐   ┌──────────────────┐
     │  NVIDIA AI        │   │  Google AI        │
     │  kimi-k2.6        │   │  gemini-embedding │
     │  (chat/generación)│   │  (vectores RAG)   │
     └──────────────────┘   └──────────────────┘
```

### 2.1 Flujo de datos

1. **CRUD / Auth / Vector search:** Frontend → Supabase directamente (sin Edge Functions)
2. **Generación de texto (LLM):** Frontend → Edge Function → NVIDIA API
3. **Embeddings (RAG):** Edge Function → Google Gemini API
4. **Archivos:** Frontend → Edge Function → Supabase Storage

---

## 3. Edge Functions (15)

| Función | Propósito | Streaming | Embeddings RAG |
|---------|-----------|-----------|----------------|
| `chat` | Tutor IA del estudiante | Sí | Sí |
| `chat-roadmap` | Asistente IA para docente (editar roadmap) | No | No |
| `analyze-error` | Análisis de respuesta incorrecta | No | No |
| `generate-roadmap` | Generar roadmap completo del curso | No | No |
| `generate-lesson` | Generar contenido teórico de un nodo | Sí | Sí |
| `generate-quiz` | Generar quiz para un nodo | No | Sí |
| `generate-test` | Generar examen de unidad | No | No |
| `generate-coliseo` | Generar examen final (Coliseo) | No | No |
| `generate-course-content` | Generar contenido en lote para todos los nodos | No | No |
| `generate-medal-svg` | Generar SVG de medalla | No | No |
| `reinforce` | Refuerzo con analogía alternativa | Sí | Sí |
| `register-user` | Crear cuenta (simula verificación) | No | No |
| `upload-source` | Subir archivo fuente a Storage | No | No |
| `embed-source` | ETL: archivo → texto → chunks → embeddings | No | Sí |
| `youtube-transcript` | Extraer transcripción de YouTube | No | No |

### 3.1 Utilidades compartidas (`_shared/`)

| Archivo | Propósito |
|---------|-----------|
| `llm.ts` | Wrapper de NVIDIA API (kimi-k2.6). Soporta streaming SSE y JSON mode |
| `embeddings.ts` | Wrapper de Google Gemini embeddings (768 dims) |
| `supabase-admin.ts` | Clientes Supabase (service role y user auth) |
| `cors.ts` | Headers CORS y handler OPTIONS |
| `chunker.ts` | División de texto por tokens (1200 chars, overlap 200) |
| `extractors/pdf.ts` | Extracción de texto de PDF (pdf-parse) |
| `extractors/docx.ts` | Extracción de texto de DOCX (mammoth) |
| `extractors/txt.ts` | Lectura de archivos TXT |
| `extractors/youtube.ts` | Transcripción de YouTube (youtube-transcript) |
| `prompts/roadmap.ts` | Prompt para generación de roadmaps |
| `prompts/quiz.ts` | Prompt para generación de quizzes |
| `prompts/lesson.ts` | Prompt para generación de lecciones |
| `prompts/analyze-error.ts` | Prompt para análisis de errores |

---

## 4. Modelo de datos (tablas principales)

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Perfiles de usuario (extiende auth.users). Roles: student, teacher, parent, admin |
| `courses` | Cursos creados por docentes |
| `nodes` | Nodos del roadmap (theory, quiz, boss, practice, reward) |
| `enrollments` | Inscripciones estudiante ↔ curso |
| `progress` | Progreso por nodo (locked, available, in_progress, completed) |
| `source_files` | Archivos fuente subidos por docentes |
| `documents` | Chunks con embeddings vectoriales (pgvector) |
| `weaknesses` | Matriz de debilidades del estudiante |
| `medals` | Medallas obtenidas |
| `notifications` | Notificaciones in-app |
| `parent_links` | Vinculación padre-estudiante |

### 4.1 Búsqueda semántica RAG

Función SQL `match_documents()`:
- Recibe un embedding vectorial de consulta
- Busca los chunks más similares dentro de un curso específico
- Retorna los top-k chunks con su nivel de similitud
- Umbral mínimo: 0.7

---

## 5. Variables de entorno

### Frontend (`.env`)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_NVIDIA_API_KEY=nvapi-...     # Para fallback directo desde browser
```

### Edge Functions (Supabase secrets)

```
NVIDIA_API_KEY=nvapi-...          # LLM (kimi-k2.6)
GEMINI_API_KEY=AIza...            # Embeddings (gemini-embedding-001)
```

### Backend auxiliar (`ai-backend/`)

```
NVIDIA_API_KEY=nvapi-...
```

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` se inyectan automáticamente en Edge Functions.

---

## 6. Estructura de carpetas

```
PROYECTO_EDUAPP/
├── src/                         # Frontend React
│   ├── components/              # Componentes compartidos (Header, Mascot, PageWrapper, etc.)
│   ├── context/                 # AuthContext (estado global de autenticación)
│   ├── lib/                     # Utilidades: supabase, api, llm, gemini, streaming, sanitize, ai-client
│   ├── pages/                   # 20 páginas (JSX + CSS)
│   ├── utils/                   # sounds.js, vibration.js
│   ├── App.jsx                  # Router principal
│   └── index.css                # Estilos globales
├── supabase/
│   ├── functions/               # 15 Edge Functions
│   │   ├── _shared/             # Utilidades compartidas (llm.ts, embeddings.ts, prompts, extractors)
│   │   └── [funcion]/index.ts   # Cada Edge Function
│   ├── migrations/              # 4 migraciones SQL
│   └── config.toml              # Configuración de Supabase
├── ai-backend/                  # Express.js backend auxiliar
├── scripts/                     # Scripts de testing y utilidad
├── docs/                        # Documentación del proyecto
│   ├── DESIGN.md                # Sistema de diseño UI
│   ├── ARCHITECTURE.md          # Este archivo
│   ├── SPEC.md                  # Requerimientos funcionales (31 RF)
│   └── DEMO.md                  # Cuentas de prueba y scripts
├── .agents/                     # Skills de modelos de IA
│   ├── skills/                  # 8 skills instaladas
│   └── roadmap-regulation/      # Reglas pedagógicas personalizadas
├── AGENTS.md                    # Guía para modelos de IA
└── package.json
```

---

## 7. Roadmap futuro

Features pendientes identificadas en el cruce del SPEC (docs/SPEC.md) contra la implementación actual.

### 7.1 Alta prioridad (core del producto)

| # | Feature | RF | Descripción |
|---|---------|-----|-------------|
| 1 | **Pantalla UnitTest** | RF-18 | No existe route `/test` ni componente. Necesaria para evaluaciones de unidad (10 preguntas, timer global 15min, 70% para aprobar) |
| 2 | **Coliseo con IA** | RF-19 | Actualmente 5 preguntas hardcoded de biología. Necesita: generación por IA (20 preguntas), dificultad adaptativa, "Modo Entrenamiento Especial" tras fallo, cooldown 4h |
| 3 | **Navegación por voz** | RF-25 | Cero integración Web Speech API. Botón micrófono en Quiz/Coliseo es decorativo (sin handler). Necesita: SpeechRecognition global, comandos de voz, TTS, modo guía |
| 4 | **Anti-cheating** | RF-18 | Sin `document.visibilityState` check. Sin notificación al docente de actividad sospechosa |

### 7.2 Media prioridad (gamificación y engagement)

| # | Feature | RF | Descripción |
|---|---------|-----|-------------|
| 5 | **Confetti animations** | — | Cero implementación. Necesario para: subida de nivel en barra de sincronía, victoria en Coliseo |
| 6 | **Ceremonia de medallas** | RF-22 | Medallas aparecen silenciosamente. Falta: modal fullscreen, rotación 360° CSS, TTS nombre+descripción |
| 7 | **Aceptación de vínculo padre (UI estudiante)** | RF-29 | `requestParentLink()` crea notificación pero no hay pantalla para aceptar/rechazar |
| 8 | **"Retos del día" dinámicos** | RF-09 | Sección hardcodeada. Necesita: spaced repetition real, Coliseos recién desbloqueados |

### 7.3 Baja prioridad (pulido)

| # | Feature | RF | Descripción |
|---|---------|-----|-------------|
| 9 | **Reportes PDF** | RF-30 | Sin librería PDF. Botón "Generar informe PDF" no existe |
| 10 | **Detalle de estudiante (padre)** | RF-30 | No existe route `/parent/students/:id`. Falta: tabs de progreso, medallas, dificultades |
| 11 | **OAuth real** | RF-01 | Botón Google decorativo (sin onClick). Microsoft ausente |
| 12 | **Notificaciones real-time** | RF-31 | Sin Supabase Realtime subscriptions. Notificaciones se fetchan una vez |
| 13 | **Emails de reportes** | RF-31 | Sin infraestructura de envío. Falta Resend o similar |
| 14 | **Evolución de mascotas** | RF-24 | Niveles de XP mostrados sin mecánica real de evolución ni accesorios |
| 15 | **Refactorización cognitiva** | RF-27 | No simplifica preguntas tras 2 errores consecutivos. Sin extensión de tiempo ni hints auditivos |
| 16 | **Palabras interactivas (definition drawer)** | RF-14 | Click en `<key>` no abre drawer con definición. Solo tiene CSS punteado |

### 7.4 Resumen de estado

| Estado | Cantidad | Porcentaje |
|--------|----------|------------|
| Implementado completamente | 13 RF | 42% |
| Parcialmente implementado | 14 RF | 45% |
| No implementado | 4 RF | 13% |
| **Total** | **31 RF** | **100%** |

---

## 8. Decisiones de stack (definidas)

| Decisión | Elección | Alternativa descartada |
|----------|----------|----------------------|
| LLM principal | NVIDIA `kimi-k2.6` | Google Gemini (plan original, descartado) |
| Embeddings | Google `gemini-embedding-001` | OpenAI text-embedding-3-small |
| Streaming LLM | SSE nativo de NVIDIA | Server-Sent Events manual |
| Backend | Supabase Edge Functions (Deno) | Express.js propio (solo auxiliar) |
| Base de datos | Supabase Postgres + pgvector | MongoDB, Pinecone |
| Frontend | React 19 + Vite 8 | Next.js, Vue |
| CSS | Archivos CSS por componente | Tailwind, CSS-in-JS |
