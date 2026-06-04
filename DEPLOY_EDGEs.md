# Deploy de Edge Functions — Supabase

Este documento lista los pasos exactos para desplegar las 11 Edge Functions de IA/RAG en Supabase usando el `project_ref` `oodijhbtgomlrchrvwzu`.

## Requisitos previos

1. [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 1.200.
2. Estar logueado al proyecto: `supabase login` (o exportar `SUPABASE_ACCESS_TOKEN`).
3. Variables de entorno en `.env` (raíz del repo):
   ```
   SUPABASE_PROJECT_ID=oodijhbtgomlrchrvwzu
   SUPABASE_ACCESS_TOKEN=SUPABASE_ACCESS_TOKEN_PLACEHOLDER
   GEMINI_API_KEY=AIza...          # https://aistudio.google.com/app/apikey
   ```
4. VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY ya están en `.env` (frontend).

## 1. Vincular el proyecto

```powershell
supabase link --project-ref oodijhbtgomlrchrvwzu
```

## 2. Aplicar las migraciones SQL

Las migraciones viven en `supabase/migrations/`. Aplicar con:

```powershell
supabase db push
```

Orden esperado (alphabetical):

- `20260602200820_init.sql` — schema, RLS, buckets de Storage, trigger `handle_new_user`.
- `20260602200821_rag_vector.sql` — tabla `documents` + `match_documents` (vector(768), HNSW).

Si el pooler Supabase responde `ECIRCUITBREAKER`, esperar 30 min y reintentar.

## 3. Configurar secretos (Gemini + Auth)

```powershell
supabase secrets set GEMINI_API_KEY=AIza... --project-ref oodijhbtgomlrchrvwzu
```

La `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_URL` son proporcionadas automáticamente por Supabase al deploy; **no** las setees manualmente.

## 4. Desplegar funciones (en orden)

El orden importa sólo por dependencias: `_shared/*` y `embed-source` son prerrequisitos lógicos para el resto. Funciones finales:

```powershell
supabase functions deploy embed-source --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy chat --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy generate-lesson --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy generate-quiz --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy generate-test --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy generate-coliseo --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy generate-roadmap --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy analyze-error --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy reinforce --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy youtube-transcript --project-ref oodijhbtgomlrchrvwzu
supabase functions deploy generate-medal-svg --project-ref oodijhbtgomlrchrvwzu
```

> El flag `--no-verify-jwt=false` es por defecto; las funciones leen `Authorization: Bearer <jwt>` del cliente Supabase. Si quieres exponer funciones públicas, pasar `--no-verify-jwt`.

## 5. Verificación rápida

Logs por función:

```powershell
supabase functions logs embed-source --project-ref oodijhbtgomlrchrvwzu --tail
supabase functions logs chat --project-ref oodijhbtgomlrchrvwzu --tail
```

Test manual (usando el `access_token` del usuario desde el navegador):

```js
// en consola del navegador
const { data: { session } } = await supabase.auth.getSession()
const res = await supabase.functions.invoke('chat', {
  body: { courseId: '<id>', message: '¿Qué es la mitocondria?' },
  headers: { Authorization: `Bearer ${session.access_token}` },
})
```

## 6. Modelo de embeddings

Las funciones usan **Gemini Embeddings** `gemini-embedding-001` (768 dimensiones).
El schema SQL local usa `vector(768)` + índice **HNSW** (consistente con la sección 1 del plan,
que ya corregía el bug del plan original con `vector(1536)` y `ivfflat`).

## 7. Modelo de generación

**Gemini 2.5 Flash** con `stream=true` por defecto. Para transmisión SSE el cliente
parsea `data: {...}\n\n` (ver `src/lib/streaming.js`).

## 8. Estructura de archivos

```
supabase/
├── migrations/
│   ├── 20260602200820_init.sql          # base + RLS + storage
│   └── 20260602200821_rag_vector.sql    # documents + match_documents
└── functions/
    ├── _shared/
    │   ├── cors.ts                      # CORS para todas las funciones
    │   ├── supabase-admin.ts            # cliente con SERVICE_ROLE
    │   ├── embeddings.ts                # wrapper Gemini embeddings 768d
    │   ├── llm.ts                       # wrapper Gemini 2.5 Flash streaming
    │   ├── chunker.ts                   # split por tokens con overlap
    │   ├── extractors/
    │   │   ├── pdf.ts                   # pdf-parse
    │   │   ├── docx.ts                  # mammoth
    │   │   ├── txt.ts                   # lectura directa
    │   │   └── youtube.ts               # youtube-transcript + captions fallback
    │   └── prompts/
    │       ├── lesson.ts                # system prompt generar lección
    │       ├── quiz.ts                  # system prompt generar quiz
    │       ├── roadmap.ts               # system prompt generar roadmap
    │       └── analyze-error.ts         # system prompt analizar error
    ├── embed-source/index.ts            # ETL Storage -> documents
    ├── chat/index.ts                    # RAG streaming
    ├── generate-lesson/index.ts
    ├── generate-quiz/index.ts
    ├── generate-test/index.ts
    ├── generate-coliseo/index.ts
    ├── generate-roadmap/index.ts
    ├── analyze-error/index.ts
    ├── reinforce/index.ts
    ├── youtube-transcript/index.ts
    └── generate-medal-svg/index.ts
```

## 9. Smoke test end-to-end

1. Login como teacher en el frontend.
2. Crear un curso nuevo desde el panel, subir un PDF de prueba.
3. Esperar el toast "Roadmap generado".
4. Login como student, ir a Explore, ver el curso, inscribirse con código de invitación.
5. Abrir el primer nodo del roadmap (teoría).
6. Chatear con el tutor: "¿Cuál es la idea principal?" — debería responder con contenido del PDF.
7. Terminar el nodo, ir al quiz. Responder mal: debería aparecer una pista generada por `analyze-error`.
8. Verificar medalla en `Achievements`.
