## Contexto del Curso

- **Titulo**: {{course_title}}
- **Categoria**: {{course_category}}
- **Descripcion**: {{course_description}}
- **Nivel de estudiantes**: {{age_level}}
- **Rigor pedagogico**: {{pedagogical_rigor}} (1-5)

## Material del curso disponible

{{course_materials}}

## Perfil del estudiante objetivo

- **Sync Score**: {{sync_score}} (0.0 - 1.0)
- **Edad/Grado**: {{student_age_group}}

## Instrucciones especificas (OBLIGATORIAS)

1. Genera un roadmap con al menos {{min_nodes}} nodos (minimo 5, recomendado 10-15)
2. El primer nodo debe ser accesible (status: "available")
3. **DISTRIBUCION OBLIGATORIA**: Cada 2 o 3 nodos de teoria debe haber 1 nodo quiz
   - Ejemplo correcto: theory, theory, quiz, theory, practice, quiz, theory, theory, quiz, boss
   - Ejemplo INCORRECTO: theory, theory, theory, theory, quiz (NUNCA 4+ teorias seguidas sin quiz)
4. El ultimo nodo debe ser tipo "boss" (examen final)
5. Incluye un camino alternativo o ramificacion si hay suficiente contenido
6. Distribuye los tipos de nodo segun las reglas pedagogicas
7. Considera el sync_score para ajustar la dificultad y estructura

Recuerda: Responde UNICAMENTE con el JSON, sin texto adicional.
