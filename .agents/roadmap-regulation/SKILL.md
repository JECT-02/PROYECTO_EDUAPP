---
name: roadmap-regulation
description: Reglas pedagógicas que debe respetar el Edge Function `generate-roadmap` al crear el árbol de nodos de un curso. Solo 3 tipos: theory, quiz, boss.
---

# Reglas del roadmap generado por IA

## 1. Tipos de nodo permitidos

**SOLO existen 3 tipos de nodo:**

| Tipo | Descripción | Contenido |
|------|-------------|-----------|
| `theory` | Lección teórica | HTML de 300-600 palabras |
| `quiz` | Evaluación parcial | JSON con 4 preguntas y explicaciones |
| `boss` | Examen final | JSON con 5-8 preguntas integrales |

**NO existen**: practice, reward, ni otros tipos.

## 2. Tamaño del roadmap

- Mínimo **6 nodos**, máximo **12 nodos**.
- Si el temario parece muy corto, divide cada tema en 2-3 nodos theory.
- Si es muy largo, agrupa temas relacionados en un solo nodo theory.

## 3. Secuencia obligatoria

```
theory → theory → theory → quiz → theory → theory → quiz → boss
```

- **Primer nodo**: SIEMPRE `theory` (introducción)
- **Después de cada 2-3 nodos theory**: SIEMPRE un `quiz`
- **Último nodo**: SIEMPRE `boss` (examen final)
- **Mínimo 1 quiz** antes del boss (si hay más de 4 nodos theory)

## 4. Reglas para quizzes

### Frecuencia
- Después de **2 o 3 nodos theory consecutivos** → **quiz obligatorio**
- No más de 1 quiz consecutivo (siempre debe haber al menos 1 theory entre quizzes)

### Contenido
- **4 preguntas** de opción múltiple exactamente
- **4 opciones** por pregunta (A, B, C, D)
- Preguntas **ESPECÍFICAS** sobre el contenido de los nodos theory ANTERIORES
- **NO genéricas** como "¿Cuál es el concepto principal?"
- Cada pregunta tiene **explanation** que explique POR QUÉ es correcta
- El campo `correct` es el índice 0-based

### Ejemplo de quiz válido:
```json
{
  "questions": [
    {
      "id": 1,
      "text": "¿Cuál es la función principal de la mitocondria según la clase?",
      "options": [
        "A) Síntesis de proteínas",
        "B) Producción de energía (ATP)",
        "C) Almacenamiento de ADN",
        "D) Transporte de moléculas"
      ],
      "correct": 1,
      "explanation": "La mitocondria produce ATP mediante respiración celular, como se explicó en la clase sobre orgánulos celulares."
    }
  ]
}
```

## 5. Reglas para nodos theory

- HTML con `<h2>`, `<p>`, `<strong>`, `<ul>/<li>`
- **300-600 palabras** de contenido real y específico
- Basado en el material de referencia
- Ejemplos prácticos y explicaciones claras
- NO placeholder text

## 6. Reglas para el boss

- **5-8 preguntas** integrales del curso completo
- Mezcla de comprensión, aplicación y análisis
- Mismo formato que quiz

## 7. Validación post-generación (enforceRegulation)

Antes de guardar, el sistema debe:

1. Contar `quiz` y verificar frecuencia correcta (cada 2-3 theory)
2. Si faltan quizzes, insertarlos automáticamente
3. Si hay exceso de quizzes, convertir el más cercano al boss en `theory`
4. Si no hay `boss`, agregar uno al final
5. Si el primer nodo no es `theory`, cambiarlo a `theory`
6. Rellenar contenido faltante con defaults apropiados
7. Validar que quizzes tengan preguntas reales (no vacías ni genéricas)

## 8. Idioma y tono

- Todos los `title` y `description` en español latino neutro
- Títulos < 60 caracteres, específicos (no genéricos)
- Descripciones < 200 caracteres
- Sin jerga innecesaria para el nivel del curso
