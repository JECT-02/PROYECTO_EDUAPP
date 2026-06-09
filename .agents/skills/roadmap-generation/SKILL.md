---
name: roadmap-generation
description: Instrucciones para generar roadmaps de aprendizaje usando los archivos subidos por el docente como contexto. Solo 3 tipos de nodo: theory, quiz y boss.
---

# Roadmap Generation Skill

## Tipos de nodo (SOLO 3)

El roadmap solo puede contener estos 3 tipos de nodo:

| Tipo | Descripción | Contenido |
|------|-------------|-----------|
| `theory` | Lección teórica con contenido educativo | HTML con `<h2>`, `<p>`, `<strong>`, `<ul>/<li>`. 300-600 palabras. |
| `quiz` | Evaluación sobre los nodos theory anteriores | JSON con 4 preguntas de opción múltiple y explicaciones. |
| `boss` | Examen final integrador (siempre el último) | JSON con 5-8 preguntas que integren todo el curso. |

**NO existen otros tipos**: no practice, no reward, ni otros.

## Estructura obligatoria

```
theory → theory → theory → quiz → theory → theory → quiz → boss
```

- **Primer nodo**: SIEMPRE `theory` (introducción)
- **Después de cada 2-3 nodos theory**: SIEMPRE un `quiz`
- **Último nodo**: SIEMPRE `boss` (examen final)
- **Entre 6 y 12 nodos** en total

## Reglas para nodos quiz

- Cada quiz tiene **EXACTAMENTE 4 preguntas**
- Cada pregunta tiene **4 opciones** (A, B, C, D)
- Las preguntas deben ser **ESPECÍFICAS** sobre el contenido de los nodos theory anteriores
- NO genéricas como "¿Cuál es el concepto principal?"
- Cada pregunta tiene una **explanation** que explique POR QUÉ la respuesta es correcta
- El campo `correct` es el índice 0-based de la respuesta correcta

### Formato JSON de quiz:
```json
{
  "questions": [
    {
      "id": 1,
      "text": "Pregunta específica sobre el contenido",
      "options": ["A) Opción correcta", "B) Distractor creíble", "C) Distractor relacionado", "D) Distractor plausible"],
      "correct": 0,
      "explanation": "Explicación detallada de por qué A es correcta"
    }
  ]
}
```

## Reglas para nodos theory

- HTML con `<h2>`, `<p>`, `<strong>`, `<ul>/<li>`
- **300-600 palabras** de contenido educativo real y específico
- Basado en el material de referencia proporcionado
- Ejemplos prácticos y explicaciones claras
- NO usar placeholder text como "ejemplo", "concepto A", "tema X"

## Reglas para nodos boss

- **5-8 preguntas** que integren TODO el contenido del curso
- Mezcla de preguntas de comprensión, aplicación y análisis
- Mismo formato que quiz pero más comprehensivo

## Flujo completo

1. El docente crea un curso y sube archivos (PDF, DOCX, TXT)
2. Se extrae el texto de los archivos
3. La IA genera el roadmap con nodos theory/quiz/boss
4. `enforceRegulation` valida y corrige la estructura
5. El docente puede editar el roadmap antes de publicar

## Validación post-generación (enforceRegulation)

1. Primer nodo debe ser `theory`
2. Último nodo debe ser `boss`
3. Después de cada 2-3 nodos `theory` → insertar `quiz` si no existe
4. Convertir cualquier tipo no permitido a `theory`
5. Rellenar contenido faltante con defaults apropiados
6. Validar que quizzes tengan preguntas reales (no vacías)

## Dependencias

- `_shared/llm.ts` - LLM wrapper
- `_shared/extractors/*.ts` - Para extraer texto de archivos
- `_shared/prompts/roadmap.ts` - System prompt para la IA
- `_shared/supabase-admin.ts` - Admin client para DB
- `src/lib/gemini.js` - Llamadas directas NVIDIA (fallback)
