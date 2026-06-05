---
name: roadmap-generation
description: Instrucciones para generar roadmaps de aprendizaje usando los archivos subidos por el docente como contexto. El roadmap se genera via Edge Function y se muestra al docente para que pueda editarlo con IA antes de publicarlo.
---

# Roadmap Generation Skill

## Flujo completo

1. El docente crea un curso y sube archivos (PDF, DOCX, TXT) en `CourseCreateModal`
2. `CourseCreateModal` llama a `generateRoadmap({ courseId, files, rigor })`
3. La Edge Function `generate-roadmap`:
   a. Obtiene los archivos de `source_files` en Supabase Storage
   b. Descarga cada archivo del bucket `course-source`
   c. Extrae el texto con los extractores (`pdf.ts`, `docx.ts`, `txt.ts`)
   d. Concatena hasta **15000 caracteres** del material extraído
   e. Envía el material + metadata del curso a Gemini 2.5 Flash con el prompt `ROADMAP_SYSTEM`
   f. Recibe JSON con 8–15 nodos del roadmap
   g. Aplica regulación pedagógica (`enforceRegulation`)
   h. Guarda los nodos en DB con `status: 'pending_review'` y `content: null`
   i. Devuelve los nodos generados al frontend
4. Si `autoGen.contenidos` está activado, `CourseCreateModal` llama a `generateCourseContent({ courseId })`
5. La Edge Function `generate-course-content`:
   a. Obtiene todos los nodos del curso
   b. Obtiene contexto del curso (descripción + material de `documents` si existe)
   c. Para cada nodo genera el contenido completo según su tipo:
      - **theory** → HTML de 400–800 palabras con `<h2>`, `<p>`, `<div class="example-box">`
      - **practice** → HTML de 200–500 palabras con instrucciones, código de ejemplo, pista
      - **quiz** → JSON con 4 preguntas de opción múltiple
      - **boss** → JSON con 10 preguntas de examen final
      - **reward** → HTML de celebración con mensaje motivacional
   d. Procesa en lotes paralelos de **3 nodos simultáneos** (Promise.allSettled con batchSize=3)
   e. Guarda `content` en cada nodo y `status` se mantiene como `'pending_review'`
   f. Devuelve resumen con total, éxitos y fallos
6. El docente es redirigido a `RoadmapDesigner` para ver/editar el roadmap con **contenido completo** precargado
7. Puede chatear con `chat-roadmap` para hacer cambios estructurales
8. Finalmente publica el roadmap

## Formato de nodos (DB)

```typescript
interface Node {
  id: string           // UUID de Supabase
  course_id: string    // UUID del curso
  position: number     // 1..N secuencial
  type: 'theory' | 'practice' | 'quiz' | 'boss' | 'reward'
  title: string        // < 120 chars
  description: string  // < 300 chars
  content: string | null  // HTML (theory/practice) o JSON (quiz/boss) del contenido completo
  status: 'draft' | 'pending_review' | 'published' | 'archived'
}
```

## Contenido por tipo de nodo (generado por `generate-course-content`)

### Theory
El campo `content` contiene HTML completo de la lección:
```html
<h2>Subtítulo de la lección</h2>
<p>Párrafo explicativo del concepto.</p>
<div class="example-box">
  <strong>Ejemplo:</strong> Aplicación práctica del concepto.
</div>
<ul>
  <li>Punto clave 1</li>
  <li>Punto clave 2</li>
</ul>
```
- 400–800 palabras
- Formato HTML sin wrapper de código
- Encabezados `<h2>`, párrafos, listas, bloques de ejemplo
- Términos clave en `<strong>`

### Practice
```html
<h2>Título del ejercicio</h2>
<p>Instrucciones claras paso a paso...</p>
<div class="exercise-box">
  <p>Enunciado del ejercicio con datos y contexto.</p>
</div>
<pre><code>// Ejemplo de código si aplica
console.log("hola");
</code></pre>
<p class="hint">Pista: Ayuda para resolver el ejercicio.</p>
```
- 200–500 palabras
- Incluye pista de ayuda en `.hint`
- Código de ejemplo en `<pre><code>` si aplica

### Quiz
El campo `content` contiene JSON con las preguntas:
```json
{
  "questions": [
    {
      "id": 1,
      "text": "¿Cuál es la función principal de la mitocondria?",
      "options": [
        "A) Síntesis de proteínas",
        "B) Producción de energía",
        "C) Almacenamiento de ADN",
        "D) Digestión celular"
      ],
      "correct": 1,
      "explanation": "La mitocondria produce ATP, la principal fuente de energía celular."
    }
  ]
}
```
- 4 preguntas exactamente
- 4 opciones cada una, `correct` es índice 0-based
- Explicación < 50 caracteres

### Boss (examen final)
```json
{
  "title": "Examen Final - Biología Celular",
  "questions": [
    {
      "id": 1,
      "text": "Pregunta de concepto profundo?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 2,
      "explanation": "Explicación de la respuesta correcta."
    }
  ]
}
```
- 10 preguntas variadas (teoría, aplicación, análisis)
- 4 opciones cada una

### Reward
```html
<div class="reward-box" style="text-align:center;padding:40px">
  <h2>🏆 ¡Felicidades!</h2>
  <p>Mensaje de celebración para el estudiante.</p>
  <div class="medal-placeholder" style="font-size:64px;margin:20px 0">🎖️</div>
  <p>Ánimo y motivación para continuar.</p>
</div>
```

## Formato que espera la IA (input/output)

### Input a Gemini
```json
{
  "course": {
    "title": "Biología Celular",
    "description": "Curso introductorio...",
    "category": "Ciencias",
    "level": 3,
    "rigor": 4
  },
  "material": "Texto extraído de los archivos subidos por el docente (máx 15000 chars)...",
  "instructions": "Genera 8-15 nodos..."
}
```

### Output esperado de Gemini
```json
{
  "title": "Biología Celular",
  "nodes": [
    {
      "title": "Introducción a la Célula",
      "type": "theory",
      "description": "Conceptos fundamentales sobre la célula como unidad básica de la vida",
      "position": 1
    }
  ]
}
```

## Reglas pedagógicas (enforceRegulation)

Ver `.agents/roadmap-regulation/SKILL.md` para reglas detalladas.

Resumen:
- 8-15 nodos
- Primer nodo siempre `theory`
- Último nodo siempre `boss`
- Máximo 1 `quiz` cada 3 nodos no-quiz
- Proporción: ~60% theory, ~25% practice, ~10% quiz, ~5% boss/reward
- Títulos en español latino, < 60 chars
- Descripciones < 200 chars

## Edge Functions relacionadas

| Function | Propósito |
|----------|-----------|
| `generate-roadmap` | Genera el roadmap inicial desde archivos subidos |
| `chat-roadmap` | Chat IA para refinar el roadmap existente |
| `generate-course-content` | Genera contenido completo de TODOS los nodos (lecciones HTML, quizzes JSON, ejercicios, exámenes) en lotes paralelos de 3; guarda con `status: 'published'` |
| `generate-lesson` | Genera contenido de un nodo theory individual (SSE stream, acepta UUID o posición); guarda con `status: 'published'` |
| `generate-quiz` | Genera preguntas para un nodo quiz individual (JSON response, acepta UUID o posición); guarda en `content` con `status: 'published'` |
| `generate-coliseo` | Genera examen final/boss |

## Flujo del estudiante

1. StudentDashboard → `/roadmap/:courseId`
2. Roadmap carga nodos via `getCourseNodes(courseId)` (filtra solo `published`)
3. Student hace click en un nodo:
   - **theory/practice** → `/lesson/:courseId/:position`
     - Lesson.jsx busca nodo por posición
     - Si `node.content` existe → renderiza con efecto typewriter
     - Si no existe → llama `generate-lesson` (SSE), acumula el stream, guarda en DB como `published`, muestra el contenido
     - El chat del tutor también usa SSE y reemplaza contenido temporalmente
   - **quiz** → `/quiz/:courseId/:position`
     - Quiz.jsx busca nodo por posición
     - Si `node.content` tiene JSON con `{ questions: [...] }` → parsea y muestra
     - Si no existe → llama `generateQuiz` (JSON), guarda en `content` como `published`, muestra
   - **boss** → `/coliseo`
     - Coliseo.jsx llama `generateColiseo` (JSON)
4. Cada función de generación (lesson, quiz, coliseo) usa RAG: embedding de la query + `match_documents` RPC para contexto relevante

## Reglas de status
- `generate-roadmap` crea nodos con `status: 'pending_review'` (necesita aprobación docente)
- `generate-course-content` y las generaciones on-demand (lesson, quiz) guardan con `status: 'published'` para que estudiantes vean contenido inmediato
- Si un docente quiere revisar antes de publicar, debe usar `generate-roadmap` primero, aprobar nodos, y luego activar `generate-course-content` manualmente

## Dependencias

- `_shared/llm.ts` - Gemini 2.5 Flash wrapper
- `_shared/embeddings.ts` - Para embedding queries (no usado en roadmap)
- `_shared/extractors/*.ts` - Para extraer texto de archivos
- `_shared/prompts/roadmap.ts` - System prompt para la IA
- `_shared/supabase-admin.ts` - Admin client para operaciones DB
- Supabase Storage bucket `course-source` - Donde se almacenan los archivos
