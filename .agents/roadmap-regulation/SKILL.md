---
name: roadmap-regulation
description: Reglas pedagógicas que debe respetar el Edge Function `generate-roadmap` al crear el árbol de nodos de un curso (niveles, proporción de quizzes, etc.).
---

# Reglas del roadmap generado por IA

## 1. Tamaño del roadmap

- Mínimo **8 nodos**, máximo **15 nodos**.
- Si el temario del curso parece muy corto (< 5 temas), divide cada tema en 2-3 nodos.
- Si es muy largo, agrupa temas relacionados en un solo nodo "practice".

## 2. Proporción de tipos de nodo

El roadmap debe seguir esta distribución por cada 3-4 nodos:

| Tipo      | Proporción aprox. | Descripción |
|-----------|-------------------|-------------|
| `theory`  | 60%               | Conceptos y explicaciones |
| `practice`| 25%               | Ejercicios guiados, casos prácticos |
| `quiz`    | **máx. 1 cada 3 nodos** | Repaso / evaluación parcial |
| `boss`    | 1 al final        | Examen final del curso (siempre) |
| `reward`  | 0-1 entre quiz y boss | Medalla / descanso |

### Regla clave — Quizzes

> **Como máximo 1 nodo `quiz` cada 3 nodos no-quiz.**

Algoritmo (seudocódigo):
```
lastQuizPos = -10
for i, nodo in nodos:
  if nodo.type == "quiz":
    if i - lastQuizPos < 3:  # muy cerca del anterior quiz
      convertir nodo a "theory" o "practice"
    lastQuizPos = i
```

Si la IA genera un quiz, el siguiente nodo debe ser `theory` o `practice` antes de permitir otro `quiz`.

## 3. Orden pedagógico (recomendado)

1. `theory` × 2-3 (introducción, conceptos base)
2. `practice` (aplicación inmediata)
3. `quiz` (repaso de los anteriores)
4. `theory` × 1-2 (profundización)
5. `practice` (refuerzo)
6. `quiz` (repaso)
7. ...
8. `boss` (examen final integrador)
9. `reward` opcional (medalla)

## 4. Reglas de rigor / nivel

- `level` 1-2 (introductorio): más nodos `theory`, menos `practice`. Quizzes solo de opción múltiple simples.
- `level` 3 (intermedio): distribución balanceada 60/25/15.
- `level` 4-5 (avanzado): más nodos `practice` y un `quiz` extra antes del `boss`.

## 5. Posición y unicidad

- El campo `position` debe ser estrictamente ascendente (1, 2, 3, ...).
- No puede haber dos nodos con el mismo `position`.
- El `boss` siempre en la última posición.
- El primer nodo siempre es `theory` (bienvenida / introducción).

## 6. Validación post-generación

Antes de guardar, el Edge Function debe:

1. Contar `quiz` y verificar que no haya más de `floor(nodosNoQuiz / 3) + 1` quizzes.
2. Si hay exceso, convertir el quiz más cercano al `boss` en `practice`.
3. Si no hay ningún `boss`, agregar uno al final con título "Examen final: <curso>".
4. Si el primer nodo no es `theory`, cambiarlo a `theory` con título "Bienvenida".

## 7. Idioma y tono

- Todos los `title` y `description` en español latino neutro.
- Títulos < 60 caracteres.
- Descripciones < 200 caracteres.
- Sin jerga innecesaria para el nivel del curso.
