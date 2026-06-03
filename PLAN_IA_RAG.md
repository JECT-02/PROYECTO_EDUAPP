# Plan de Implementación: IA, RAG y Asistente para EduApp

> Documento de arquitectura y roadmap técnico para integrar Retrieval-Augmented Generation (RAG), asistente IA, generación de lecciones/quizzes/roadmaps y análisis cognitivo en EduApp, usando **Supabase como backend unificado** (BaaS + Edge Functions).

---

## 1. Resumen ejecutivo

| Decisión | Elección recomendada | Por qué |
|---|---|---|
| Backend propio | **No** | Todo se cubre con Supabase |
| Base de datos | **Supabase Postgres** | Roles, progreso, cursos, roadmaps |
| Auth | **Supabase Auth** | Login, registro, OTP, OAuth, magic links |
| Storage | **Supabase Storage** | PDFs, avatares, mascotas, recursos |
| Vector store (RAG) | **pgvector en Supabase** | Búsqueda semántica sin servicio externo |
| Lógica de IA | **Supabase Edge Functions (Deno)** | Serverless, sin servidor que mantener, escala automática |
| LLM (chat/generación) | **Google Gemini 2.5 Flash** (vía AI Studio) | **GRATIS**, 1.5K req/día, 1M tokens/min, contexto 1M, multimodal, excelente español |
| Embeddings | **Google `gemini-embedding-001`** (768 dim) | **GRATIS**, 1.5K req/día, 10M tokens/min, MTEB 68.32, multilingual |
| Frontend | **El mismo (Vite + React)** | Se conecta a Supabase con `supabase-js` |

> Stack 100% gratuito. Un único proveedor (Google AI Studio) con una sola API key. Si en el futuro se quiere más velocidad de streaming, se puede cambiar el chat a **Groq** (Llama 3.3 70B a 700+ TPS, free tier 30 RPM / 14.4K req/día) sin tocar el resto.

---

## 2. Arquitectura

```
┌──────────────────────────────────────────────────┐
│  FRONTEND  (Vite + React, ya existente)          │
│  - supabase-js directo (datos, auth, vector)     │
│  - fetch a Edge Functions SOLO para IA           │
└──────────────┬──────────────────┬─────────────────┘
               │                  │
       ┌───────▼──────┐   ┌───────▼──────────────┐
       │  SUPABASE    │   │  SUPABASE EDGE       │
       │  (BaaS)      │   │  FUNCTIONS (Deno)    │
       │              │   │                       │
       │ • Auth       │   │ • /embed-source      │
       │ • Postgres   │   │ • /chat (RAG+stream) │
       │ • Storage    │   │ • /generate-lesson   │
       │ • pgvector   │   │ • /generate-quiz     │
       │ • Realtime   │   │ • /generate-roadmap  │
       │ • RLS        │   │ • /analyze-error     │
       └──────────────┘   │ • /youtube-transcript│
                          └───┬──────────────────┘
                              │
                     ┌────────▼────────┐
                     │  LLM Provider   │
                     │  Google AI      │
                     │  Studio (free)  │
                     └─────────────────┘
```

**Regla general:** el frontend habla directo con Supabase para todo lo que sea CRUD/auth/vector-search. Solo pasa por Edge Functions cuando hay que llamar a un LLM o ejecutar lógica server-side pesada.

---

## 3. Mapeo: requerimiento → servicio

### 3.1 Va en Supabase "puro" (sin Edge Functions)

| Funcionalidad (RF del spec) | Servicio Supabase |
|---|---|
| Login, registro, OTP, OAuth (RF-01,02,04) | `supabase.auth` |
| Roles (`student`, `teacher`, `parent`, `admin`) | Tabla `profiles` + RLS |
| Cursos, roadmaps, nodos, progreso | `courses`, `nodes`, `enrollments`, `progress` |
| Vinculación padre-estudiante, invitaciones | `parent_links` + Realtime |
| Avatares, mascotas, medallas (SVG) | `storage` buckets `avatars`, `medals` |
| Notificaciones in-app | `notifications` + Realtime |
| Embeddings de material | Tabla `documents` con `vector(1536)` (pgvector) |
| Búsqueda semántica RAG | SQL function `match_documents()` |
| Matriz de debilidades, sincronía, XP | Tablas analíticas + vistas materializadas |
| Email transaccional (reportes semanales) | Edge Function + Resend (no SMTP propio) |

### 3.2 Va en Edge Functions

| Endpoint | Propósito | Trigger |
|---|---|---|
| `POST /embed-source` | Extrae texto de PDF/DOCX/TXT, chunking, embeddings, guarda en `documents` | Docente sube archivo y presiona "Procesar" |
| `POST /chat` | RAG: embed query → top-k chunks → prompt → stream al cliente | Estudiante escribe en el chat del tutor |
| `POST /generate-lesson` | Genera texto teórico de un nodo desde los chunks del curso | Docente aprueba nodo o estudiante entra a `/lesson` |
| `POST /generate-quiz` | Genera 3-5 preguntas adaptativas usando matriz de debilidades | Estudiante entra a `/quiz` |
| `POST /generate-test` | Test de 10 preguntas (40% débiles, 40% actual, 20% repaso) | Estudiante entra a `/test` |
| `POST /generate-coliseo` | 20 preguntas integradoras con dificultad adaptativa | Estudiante entra a `/coliseo` |
| `POST /generate-roadmap` | El LLM propone nodos a partir del material del curso | Docente en paso 3 del wizard de creación |
| `POST /analyze-error` | Análisis cognitivo de respuesta incorrecta | Estudiante falla una pregunta |
| `POST /reinforce` | Regenera analogía con estilo ("como si tuviera 5 años", "con memes"...) | Estudiante presiona "Aún no entiendo" |
| `POST /youtube-transcript` | Extrae transcripción de URL de YouTube | Docente pega link en wizard |
| `POST /generate-medal-svg` | Genera SVG de medalla con nombre/fecha/rareza | Estudiante cumple condición de desbloqueo |

---

## 4. Modelo de datos (Postgres)

Esquema base (los IDs de usuario vienen de `auth.users` de Supabase):

```sql
-- Perfiles (extiende auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('student','teacher','parent','admin')),
  full_name text,
  email text,
  age_band text,                  -- '7-10','11-14','15-17','18+'
  institution text,
  subject text,
  relation text,                  -- para parents: 'padre','madre','tutor'
  avatar_id int,
  pet_type text check (pet_type in ('dragon','robot','owl')),
  pet_name text,
  pet_xp int default 0,
  accessibility_settings jsonb default '{}',
  created_at timestamptz default now()
);

-- Cursos
create table courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id),
  title text not null,
  description text,
  category text,
  level text,
  cover_url text,
  status text check (status in ('draft','published','archived')) default 'draft',
  rigor int default 3,            -- slider 1-5 del docente
  invite_token text unique,       -- código para inscripción
  created_at timestamptz default now()
);

-- Nodos del roadmap
create table nodes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  position int not null,          -- orden en la serpiente
  type text check (type in ('theory','practice','quiz','boss','reward')),
  title text not null,
  description text,               -- generado por IA, en estado pending_review
  content text,                   -- texto de la lección teórica
  status text check (status in ('pending_review','published')) default 'pending_review',
  created_at timestamptz default now()
);

-- Inscripciones
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  course_id uuid references courses(id),
  enrolled_at timestamptz default now(),
  unique(student_id, course_id)
);

-- Progreso por nodo
create table progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references enrollments(id) on delete cascade,
  node_id uuid references nodes(id),
  state text check (state in ('locked','available','in_progress','completed')) default 'locked',
  score numeric,                  -- 0-1, para quizzes
  attempts int default 0,
  completed_at timestamptz
);

-- Material fuente para RAG
create table source_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  filename text,
  storage_path text,              -- path en Supabase Storage
  file_type text,                 -- 'pdf','docx','txt','youtube'
  status text check (status in ('pending','extracting','embedding','ready','error')) default 'pending',
  chunks_count int,
  created_at timestamptz default now()
);

-- Chunks con embeddings (núcleo del RAG)
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  source_id uuid references source_files(id) on delete cascade,
  chunk_index int,
  content text not null,
  embedding vector(1536),         -- text-embedding-3-small
  metadata jsonb default '{}',    -- página, sección, timestamp YouTube, etc.
  created_at timestamptz default now()
);

create index on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Función SQL para búsqueda semántica
create or replace function match_documents(
  query_embedding vector(1536),
  match_course_id uuid,
  match_count int default 5,
  match_threshold float default 0.7
) returns table (
  id uuid, content text, metadata jsonb, similarity float
) language sql stable as $$
  select id, content, metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where course_id = match_course_id
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Matriz de debilidades (alimenta quizzes adaptativos)
create table weaknesses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  course_id uuid references courses(id),
  concept text not null,
  confusion_level int default 0,  -- sube con cada "Aún no entiendo"
  total_errors int default 0,
  last_seen timestamptz,
  unique(student_id, course_id, concept)
);

-- Medallas
create table medals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  medal_type text,                -- 'mastery','behavior','secret'
  name text,
  rarity text check (rarity in ('common','rare','epic','legendary')),
  svg_url text,                   -- generada y guardada en Storage
  unlocked_at timestamptz default now()
);

-- Notificaciones
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  type text,                      -- 'parent_request','alert','medal','message'
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- Vinculación padre-estudiante
create table parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references profiles(id),
  student_id uuid references profiles(id),
  status text check (status in ('pending','accepted','rejected')) default 'pending',
  created_at timestamptz default now(),
  unique(parent_id, student_id)
);
```

### 4.1 Row Level Security (RLS) — obligatorio

Ejemplos:

```sql
-- Estudiantes solo ven su propio progreso
alter table progress enable row level security;
create policy "student sees own progress" on progress for select
  using (
    enrollment_id in (
      select id from enrollments where student_id = auth.uid()
    )
  );

-- Docentes solo editan sus cursos
alter table courses enable row level security;
create policy "teacher edits own courses" on courses for all
  using (teacher_id = auth.uid());

-- Padres solo leen datos de hijos vinculados
create policy "parent reads linked student" on progress for select
  using (
    enrollment_id in (
      select e.id from enrollments e
      join parent_links pl on pl.student_id = e.student_id
      where pl.parent_id = auth.uid() and pl.status = 'accepted'
    )
  );
```

> Activar RLS en **todas** las tablas. Esto es la barrera principal de seguridad para un producto con datos de menores.

---

## 5. Flujo RAG paso a paso

### 5.1 Ingesta de material (docente)

```
1. Docente sube PDF → Supabase Storage (bucket: course-source)
2. Inserta row en source_files (status='pending')
3. Edge Function /embed-source se dispara:
     a. Descarga archivo del Storage
     b. Extrae texto (pdf-parse / mammoth para DOCX)
     c. Chunking: 1000 chars con overlap 200
     d. Para cada chunk:
          embedding = openai.embeddings.create(chunk)
          INSERT INTO documents (course_id, source_id, content, embedding)
     e. UPDATE source_files SET status='ready', chunks_count=N
4. Docente ve "Listo" en la UI (Realtime subscription al status)
```

### 5.2 Chat del tutor (estudiante pregunta)

```
1. Estudiante envía pregunta en /chat
2. Frontend hace POST /chat { courseId, message }
3. Edge Function:
     a. embedding = openai.embeddings.create(message)
     b. SELECT * FROM match_documents(embedding, courseId, 5)
     c. system_prompt = "Eres un tutor de [curso]. Responde solo con el material provisto..."
     d. user_prompt = "Contexto:\n[chunks]\n\nPregunta: [message]"
     e. openai.chat.completions.create(stream=true)
     f. Devuelve stream al cliente (Server-Sent Events o ReadableStream)
4. Frontend renderiza tokens a medida que llegan
```

### 5.3 Generación de lección / quiz / roadmap

Mismo patrón: edge function arma un prompt con contexto relevante (chunks via `match_documents` + perfil del estudiante + debilidades), llama al LLM, valida la salida (JSON schema), guarda en la tabla correspondiente.

---

## 6. Edge Functions — esquema

```
supabase/
├── functions/
│   ├── _shared/
│   │   ├── openai.ts          # cliente OpenAI con retry
│   │   ├── supabase-admin.ts  # service role key
│   │   ├── chunker.ts         # split de texto
│   │   ├── extractors/
│   │   │   ├── pdf.ts
│   │   │   ├── docx.ts
│   │   │   └── youtube.ts
│   │   └── prompts/
│   │       ├── lesson.ts
│   │       ├── quiz.ts
│   │       ├── roadmap.ts
│   │       └── analyze-error.ts
│   ├── embed-source/index.ts
│   ├── chat/index.ts
│   ├── generate-lesson/index.ts
│   ├── generate-quiz/index.ts
│   ├── generate-test/index.ts
│   ├── generate-coliseo/index.ts
│   ├── generate-roadmap/index.ts
│   ├── analyze-error/index.ts
│   ├── reinforce/index.ts
│   ├── youtube-transcript/index.ts
│   └── generate-medal-svg/index.ts
└── migrations/
    ├── 0001_init.sql
    ├── 0002_rls.sql
    ├── 0003_pgvector.sql
    └── 0004_functions.sql
```

### 6.1 Ejemplo: `embed-source/index.ts` (esquema con Google AI Studio)

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // bypasses RLS
);
const genai = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
const embedModel = genai.getGenerativeModel({ model: "gemini-embedding-001" });

serve(async (req) => {
  const { sourceId } = await req.json();

  const { data: src } = await supabase
    .from("source_files")
    .select("*")
    .eq("id", sourceId).single();

  await supabase.from("source_files")
    .update({ status: "extracting" }).eq("id", sourceId);

  // 1. descargar y extraer texto según file_type
  const text = await extractText(src);  // pdf / docx / txt

  // 2. chunking
  const chunks = chunkText(text, 1000, 200);

  await supabase.from("source_files")
    .update({ status: "embedding" }).eq("id", sourceId);

  // 3. embedding en lotes (Gemini soporta batchEmbedContents hasta 100)
  for (const batch of chunkBatches(chunks, 50)) {
    const result = await embedModel.batchEmbedContents({
      requests: batch.map(c => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: c.text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      })),
    });
    const rows = batch.map((c, i) => ({
      course_id: src.course_id,
      source_id: sourceId,
      chunk_index: c.index,
      content: c.text,
      embedding: result.embeddings[i].values,
      metadata: c.metadata,
    }));
    await supabase.from("documents").insert(rows);
  }

  await supabase.from("source_files")
    .update({ status: "ready", chunks_count: chunks.length })
    .eq("id", sourceId);

  return new Response(JSON.stringify({ ok: true, chunks: chunks.length }));
});
```

### 6.2 Ejemplo: `chat/index.ts` (esquema con streaming Gemini)

```ts
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21";

const genai = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
const chatModel = genai.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: "Eres el tutor IA de un curso. Responde SOLO con la información del contexto provisto. Si no está, dilo. Cita la fuente cuando puedas.",
});

serve(async (req) => {
  const { courseId, message, history = [] } = await req.json();

  // 1. embedding de la query (RETRIEVAL_QUERY para queries)
  const queryEmb = await embedModel.embedContent({
    content: { parts: [{ text: message }] },
    taskType: "RETRIEVAL_QUERY",
  });

  // 2. top-k chunks vía pgvector
  const { data: chunks } = await supabase.rpc("match_documents", {
    query_embedding: queryEmb.embedding.values,
    match_course_id: courseId,
    match_count: 5,
    match_threshold: 0.7,
  });

  // 3. armar prompt
  const context = chunks.map(c => c.content).join("\n\n---\n\n");
  const userMessage = `Contexto:\n${context}\n\nPregunta: ${message}`;

  // 4. streaming con Gemini
  const result = await chatModel.generateContentStream({
    contents: [
      ...history,
      { role: "user", parts: [{ text: userMessage }] },
    ],
  });

  // 5. devolver como SSE
  const body = result.stream;  // AsyncIterable<EnhancedGenerateContentResponse>

  // ... envolver en ReadableStream SSE para el cliente
});
```

---

## 7. Frontend: cómo se conecta

```ts
// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Auth (reemplaza la lógica actual de login)
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signUp({ email, password, options: { data: { role } } });

// Datos directos (sin Edge Function)
const { data: courses } = await supabase
  .from("courses")
  .select("*, nodes(*)")
  .eq("status", "published");

// Vector search directo desde el cliente (si se quiere)
const { data: chunks } = await supabase.rpc("match_documents", {
  query_embedding: [...],
  match_course_id: courseId,
});

// Chat con streaming
const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`,
  },
  body: JSON.stringify({ courseId, message }),
});
const reader = res.body.getReader();
// ... renderizar tokens a medida que llegan
```

---

## 8. Seguridad y buenas prácticas

| Aspecto | Implementación |
|---|---|
| API keys | Solo en Edge Functions (`Deno.env.get`). **Nunca** en el frontend |
| Auth en Edge Functions | Validar JWT de Supabase en cada request (`supabase.auth.getUser(token)`) |
| RLS | Activa en todas las tablas. Service role key solo en Edge Functions |
| Sanitización | Toda salida de LLM pasa por **DOMPurify** en frontend (RF seguridad 4.2 del spec) |
| Rate limiting | `supabase_ratelimit` extension o Upstash Redis en Edge |
| Datos de menores | Consentimiento parental verificable antes de crear cuenta < 13 años (ya en spec 2.1.2) |
| PII en logs | No loguear contenido de chats ni emails. Solo metadata |
| Costo de embedding | Limitar chunks por archivo, deduplicar, batch de 50 |

---

## 9. Variables de entorno

**Frontend (`.env.local`):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Supabase Edge Functions (secrets):**
```bash
supabase secrets set GEMINI_API_KEY=AIza...    # gratis, desde aistudio.google.com
supabase secrets set RESEND_API_KEY=re_...     # opcional, para emails
```

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` ya vienen automáticamente en Edge Functions.

---

## 10. Fases de implementación

### Fase 0 — Setup (1-2 días)
- [ ] Crear proyecto en Supabase
- [ ] Instalar CLI: `npm i -g supabase`
- [ ] `supabase init` en el proyecto
- [ ] Crear buckets de Storage: `avatars`, `medals`, `course-source`
- [ ] Habilitar extensión `vector` desde el dashboard
- [ ] Variables de entorno en `.env.local` del frontend

### Fase 1 — Auth + DB (3-5 días)
- [ ] Migración: tablas `profiles`, `courses`, `nodes`, `enrollments`, `progress`
- [ ] Migración: RLS básico en esas tablas
- [ ] Reemplazar login/register del prototipo por `supabase.auth`
- [ ] Migrar datos mock a Supabase (script de seed opcional)

### Fase 2 — RAG mínimo viable (3-5 días)
- [ ] Migración: `source_files`, `documents`, función `match_documents`
- [ ] Edge Function `embed-source` (PDF + TXT primero)
- [ ] Edge Function `chat` con streaming
- [ ] UI: página del docente para subir material y ver progreso
- [ ] UI: chat del estudiante con render de streaming

### Fase 3 — Generación de contenido (5-7 días)
- [ ] Edge Functions: `generate-lesson`, `generate-quiz`, `generate-test`
- [ ] UI: integración con pantallas `Lesson`, `Quiz`, `Test` existentes
- [ ] Sistema de revisión docente (RF-08): nodo en `pending_review` → aprobar/rechazar

### Fase 4 — Generación de roadmap y refuerzo (5-7 días)
- [ ] Edge Function `generate-roadmap` (con slider de rigor)
- [ ] Edge Function `reinforce` (estilos de analogía)
- [ ] Edge Function `analyze-error` (corrección cognitiva)
- [ ] Edge Function `youtube-transcript`
- [ ] UI: wizard de creación de curso paso 3

### Fase 5 — Coliseo, medallas, gamificación (5-7 días)
- [ ] Edge Function `generate-coliseo` (dificultad adaptativa)
- [ ] Edge Function `generate-medal-svg` (medallas dinámicas)
- [ ] Matriz de debilidades + alertas automáticas al docente
- [ ] Emails transaccionales (Resend) para reportes semanales

### Fase 6 — Producción y pulido (ongoing)
- [ ] Observabilidad: logs de Edge Functions, Sentry
- [ ] Rate limiting y quotas por usuario
- [ ] Optimización de costos (caché de embeddings, batch)
- [ ] Auditoría WCAG 2.1 AA con axe-core
- [ ] Backup automático y plan de recuperación

> **Total estimado:** 4-6 semanas para un MVP completo con todas las features de IA del spec.

---

## 11. Costos estimados (mensual, 1000 estudiantes activos) — STACK GRATUITO

| Servicio | Costo |
|---|---|
| Supabase (plan Free) | **$0** (500MB DB, 1GB storage, 2GB bandwidth) |
| Google AI Studio (Gemini 2.5 Flash) | **$0** (1.5K req/día, 1M TPM — alcanza para ~1K usuarios activos) |
| Google AI Studio (Gemini Embedding) | **$0** (1.5K req/día, 10M tokens/min) |
| Resend emails | **$0** (3K emails/mes) |
| **Total** | **$0 / mes** |

### ⚠️ Caveat importante del free tier de Google

Google **puede usar los datos del free tier para entrenar sus modelos**. Para EduApp (datos de menores) hay dos opciones:

- **Aceptar el riesgo** (lo razonable para prototipos y MVPs): usar Google AI Studio. Los PDFs/material que suben los docentes suelen ser contenido educativo público.
- **Producción con datos sensibles**: migrar a **Vertex AI** (mismo Gemini, pero con SLA, sin training opt-in, y facturación por uso — sigue siendo barato: ~$0.30/1M tokens input para Flash).

### Cuándo hay que pagar

Si se superan los límites gratuitos (escenario: > 1.5K req/día o > 1K usuarios activos concurrentes):
- Upgrade Supabase a Pro: $25/mes
- Migrar Gemini a Vertex AI (Tier 1):~$50-100/mes según uso
- **Total realista en escala:** $100-150/mes (igual que antes pero ya con producto en producción)

### Alternativa más rápida para streaming: Groq

Si la latencia de Gemini (no es tan rápido como Groq) molesta en el chat, se puede usar **Groq** solo para `/chat`:
- Llama 3.3 70B: 30 RPM, 14.4K req/día gratis, **700+ TPS** (casi sin lag visible)
- Mantener Gemini para embeddings y para generación de lecciones/quizzes (donde la latencia importa menos)
- Mismo patrón: solo se cambia el cliente en `_shared/openai.ts` → `_shared/llm.ts`

---

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| LLM alucina sobre temas sensibles (datos de menores) | Prompt restrictivo + temperatura baja + RAG obligatorio + cita de fuentes + revisión docente para contenido publicado |
| **Google usa datos del free tier para entrenar** | Para producción: migrar a **Vertex AI** (mismo modelo, sin training opt-in, ~$0.30/1M tokens). Para MVP/prototipo: aceptable si los materiales son contenido público. |
| Costos de embedding explotan al pasar free tier | Cuota de almacenamiento por curso, deduplicación, compresión. Monitorear uso en AI Studio dashboard |
| Cold start de Edge Functions en chat | Streaming ya mitiga perceived latency. Si hace falta, función keep-warm |
| Cambiar de LLM provider | Toda llamada al LLM vive en `_shared/llm.ts` (interfaz abstracta). Cambiar Gemini por Groq o Anthropic requiere editar un solo archivo |
| Calidad de extracción de PDF escaneado | Si se necesita OCR, agregar Tesseract o servicio externo (Google Document AI) |
| Privacidad: menores suben material propio | Solo el docente sube material. Estudiantes solo consumen |
| Rate limit del free tier golpea en pico de uso | Implementar cola con retry exponencial en Edge Functions + caché de respuestas frecuentes (tabla `response_cache`) |

---

## 13. Decisiones de stack — DEFINIDAS

1. **Provider de LLM**: ✅ **Google Gemini 2.5 Flash** (gratis, free tier generoso, excelente español, 1M context)
2. **Provider de embeddings**: ✅ **Google `gemini-embedding-001`** (gratis, 768 dim, multilingual)
3. **Alternativa para chat de baja latencia**: 🔄 **Groq + Llama 3.3 70B** (700+ TPS, free tier 30 RPM) — activar si Gemini se siente lento
4. **Email transaccional**: ⏳ Resend (gratis hasta 3K/mes) — definir al llegar a Fase 5
5. **OCR para PDFs escaneados**: ⏳ Diferido a Fase 6 (producción)
6. **Storage region**: ⏳ Misma región que Supabase (configurar al crear el proyecto)

---

## 14. Próximos pasos inmediatos

Una vez aprobado este plan:

1. Crear proyecto Supabase (gratis para empezar)
2. `supabase init` + estructura de carpetas
3. Migración 0001: tablas base + RLS
4. Migración 0002: `pgvector` + función `match_documents`
5. Reemplazar login del prototipo con Supabase Auth
6. Primera Edge Function: `embed-source` para un PDF de prueba
7. Segunda Edge Function: `chat` con streaming
8. UI mínima: subir PDF → preguntar algo → ver respuesta con fuentes

A partir de ahí, iterar sobre las fases 2-5.
