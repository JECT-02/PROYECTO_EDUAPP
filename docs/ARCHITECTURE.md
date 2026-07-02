# EduApp — Arquitectura Técnica

> Documento vivo. Última actualización: 02/07/2026.

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
| Markdown | marked | 18.0.5 |
| Backend (BaaS) | Supabase | Postgres, Auth, Storage, Edge Functions, pgvector, Realtime |
| LLM (texto) | NVIDIA AI — `moonshotai/kimi-k2.6` | API OpenAI-compatible |
| Embeddings | Google Gemini — `gemini-embedding-001` | 768 dimensiones |
| Backend auxiliar | Express.js | 4.21 (`ai-backend/`) |
| STT (voz) | Groq — `whisper-large-v3` | API REST |
| Clasificación (voz) | Groq — `llama-3.3-70b-versatile` | API REST |
| TTS | Web Speech API | Navegador nativo |
| Despliegue Frontend | Vercel | `vercel.json` |
| Despliegue Backend | Render | `render.yaml` (free tier) |

### 1.1 Proveedores de IA

| Proveedor | Modelo | Uso | Endpoint |
|-----------|--------|-----|----------|
| **NVIDIA AI** | `moonshotai/kimi-k2.6` | Todo el texto: chat, lecciones, quizzes, roadmaps, análisis de errores, medallas | `integrate.api.nvidia.com/v1/chat/completions` |
| **Google AI** | `gemini-embedding-001` | Embeddings vectoriales para RAG (búsqueda semántica) | `generativelanguage.googleapis.com/v1beta/models/...` |
| **Groq** | `whisper-large-v3` | Speech-to-Text (voz a texto) | `api.groq.com/openai/v1/audio/transcriptions` |
| **Groq** | `llama-3.3-70b-versatile` | Clasificación de intención de voz (9 categorías, 27 acciones) | `api.groq.com/openai/v1/chat/completions` |

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
│  src/lib/voice.js ────────────► ai-backend /voice/*      │
│  src/context/VoiceContext.jsx ─► Orquestador de voz       │
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
                                       │
                  ┌────────────────────┤
                  ▼                    ▼
     ┌──────────────────┐   ┌──────────────────┐
     │  Groq AI          │   │  Web Speech API   │
     │  whisper + llama  │   │  (TTS nativo)     │
     │  (STT + classify) │   │                   │
     └──────────────────┘   └──────────────────┘
```

### 2.1 Flujo de datos

1. **CRUD / Auth / Vector search:** Frontend → Supabase directamente (sin Edge Functions)
2. **Generación de texto (LLM):** Frontend → Edge Function → NVIDIA API
3. **Embeddings (RAG):** Edge Function → Google Gemini API
4. **Archivos:** Frontend → Edge Function → Supabase Storage
5. **Voz (STT):** Frontend → ai-backend → Groq Whisper API
6. **Voz (clasificación):** Frontend → ai-backend → Groq LLaMA API
7. **Voz (TTS):** Frontend → Web Speech API (nativo del navegador)

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
| `medals` | Medallas obtenidas (18 logros en catálogo) |
| `notifications` | Notificaciones in-app (14 tipos, Realtime habilitado) |
| `parent_links` | Vinculación padre-estudiante |

### 4.1 Búsqueda semántica RAG

Función SQL `match_documents()`:
- Recibe un embedding vectorial de consulta
- Busca los chunks más similares dentro de un curso específico
- Retorna los top-k chunks con su nivel de similitud
- Umbral mínimo: 0.7

### 4.2 Fórmula de Entendimiento

```
S = (P * 0.50) + (Nc * 0.25) + (Er * 0.15) + (Te * 0.10)
```

| Variable | Nombre | Peso | Cálculo |
|----------|--------|------|---------|
| **P** | Rendimiento en quizzes | 50% | `avgScore / 100` (clamp 1.0). Fallback: Nc si no hay datos |
| **Nc** | Completado de nodos | 25% | `completedNodes / totalNodes` |
| **Er** | Ratio de errores | 15% | `totalCorrect / (totalCorrect + totalWrong)`. Default: 1.0 |
| **Te** | Esfuerzo de estudio | 10% | `studyTimeMin / 120` (clamp 1.0). Satura a 2h |

| Rango | Label | Color |
|-------|-------|-------|
| 0-30 | Inicial | `#EF4444` |
| 31-60 | En progreso | `#F97316` |
| 61-85 | Competente | `#3B82F6` |
| 86-100 | Avanzado | `#8B5CF6` |

---

## 5. Variables de entorno

### Frontend (`.env`)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_NVIDIA_API_KEY=nvapi-...     # Para fallback directo desde browser
VITE_AI_BACKEND_URL=http://localhost:3001  # URL del ai-backend Express
```

### Edge Functions (Supabase secrets)

```
NVIDIA_API_KEY=nvapi-...          # LLM (kimi-k2.6)
GEMINI_API_KEY=AIza...            # Embeddings (gemini-embedding-001)
```

### Backend auxiliar (`ai-backend/`)

```
NVIDIA_API_KEY=nvapi-...
GROQ_API_KEY=gsk_...              # STT (Whisper) + Clasificación (LLaMA)
```

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` se inyectan automáticamente en Edge Functions.

---

## 6. Estructura de carpetas

```
PROYECTO_EDUAPP/
├── src/                         # Frontend React
│   ├── components/              # Componentes compartidos (Header, Mascot, PageWrapper, VoiceIndicator, etc.)
│   ├── context/                 # AuthContext, VoiceContext
│   ├── data/                    # Datos estáticos (achievements.json)
│   ├── lib/                     # Utilidades: supabase, api, llm, gemini, streaming, sanitize, ai-client, voice, voice-commands, notifications, achievements, markdown, understanding
│   ├── pages/                   # 20 páginas (JSX + CSS)
│   ├── utils/                   # sounds.js, vibration.js
│   ├── App.jsx                  # Router principal
│   └── index.css                # Estilos globales
├── supabase/
│   ├── functions/               # 15 Edge Functions
│   │   ├── _shared/             # Utilidades compartidas (llm.ts, embeddings.ts, prompts, extractors)
│   │   └── [funcion]/index.ts   # Cada Edge Function
│   ├── migrations/              # 13 migraciones SQL
│   └── config.toml              # Configuración de Supabase
├── ai-backend/                  # Express.js backend auxiliar (voz + proxy NVIDIA)
├── scripts/                     # Scripts de testing y utilidad (20+)
├── docs/                        # Documentación del proyecto
│   ├── DESIGN.md                # Sistema de diseño UI
│   ├── ARCHITECTURE.md          # Este archivo
│   ├── SPEC.md                  # Requerimientos funcionales (31 RF)
│   ├── DEMO.md                  # Cuentas de prueba y scripts
│   └── STATUS.md                # Estado actual y deuda técnica
├── artefactos/                  # Documentación para cliente
│   ├── DISENO_UX_UI.md
│   ├── DOCUMENTACION_CLIENTE.md
│   └── DOCUMENTACION_TECNICA.md
├── .agents/                     # Skills de modelos de IA
│   ├── skills/                  # 10 skills instaladas
│   └── roadmap-regulation/      # Reglas pedagógicas personalizadas
├── vercel.json                  # Configuración despliegue frontend
├── render.yaml                  # Configuración despliegue ai-backend
├── LICENSE                      # Licencia MIT
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

### 7.2 Media prioridad (gamificación y engagement)

| # | Feature | RF | Descripción |
|---|---------|-----|-------------|
| 2 | **Confetti animations** | — | Cero implementación. Necesario para: subida de nivel en barra de sincronía, victoria en Coliseo |
| 3 | **Ceremonia de medallas** | RF-22 | Medallas aparecen silenciosamente. Falta: modal fullscreen, rotación 360° CSS, TTS nombre+descripción |
| 4 | **Aceptación de vínculo padre (UI estudiante)** | RF-29 | `requestParentLink()` crea notificación pero no hay pantalla para aceptar/rechazar |

### 7.3 Baja prioridad (pulido)

| # | Feature | RF | Descripción |
|---|---------|-----|-------------|
| 5 | **Reportes PDF** | RF-30 | Sin librería PDF. Botón "Generar informe PDF" no existe |
| 6 | **Detalle de estudiante (padre)** | RF-30 | No existe route `/parent/students/:id`. Falta: tabs de progreso, medallas, dificultades |
| 7 | **OAuth real** | RF-01 | Botón Google decorativo (sin onClick). Microsoft ausente |
| 8 | **Evolución de mascotas** | RF-24 | Niveles de XP mostrados sin mecánica real de evolución ni accesorios |
| 9 | **Refactorización cognitiva** | RF-27 | No simplifica preguntas tras 2 errores consecutivos. Sin extensión de tiempo ni hints auditivos |
| 10 | **Palabras interactivas (definition drawer)** | RF-14 | Click en `<key>` no abre drawer con definición. Solo tiene CSS punteado |

### 7.4 Features completadas desde última actualización

| # | Feature | RF | Descripción |
|---|---------|-----|-------------|
| ✅ | **Navegación por voz** | RF-25 | Sistema completo: VAD, STT (Groq Whisper), clasificación (Groq LLaMA), TTS, 27 comandos, 9 páginas integradas |
| ✅ | **Coliseo con IA** | RF-19 | 10 preguntas dinámicas generadas por IA (no más hardcoded), selección determinista por día |
| ✅ | **Notificaciones real-time** | RF-31 | Supabase Realtime, 14 tipos, UI campana + dropdown, preferencias configurables |
| ✅ | **Retos del día dinámicos** | RF-09 | Datos reales de progreso en vez de array hardcodeado |

### 7.5 Resumen de estado

| Estado | Cantidad | Porcentaje |
|--------|----------|------------|
| Implementado completamente | 14 RF | 45% |
| Parcialmente implementado | 13 RF | 42% |
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
| STT (voz) | Groq Whisper large-v3 | Web Speech API nativo (menor calidad) |
| Clasificación voz | Groq LLaMA 3.3 70B | OpenAI GPT (mayor latencia) |
| Despliegue Frontend | Vercel | Netlify, Cloudflare Pages |
| Despliegue Backend | Render free tier | Railway, Fly.io |
