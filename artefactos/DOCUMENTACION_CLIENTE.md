# EduApp — Documentación del Proyecto (Cliente)

> Plataforma educativa web con inteligencia artificial, gamificación y accesibilidad WCAG 2.1 AA.
> Público objetivo: Estudiantes y docentes de Latinoamérica.

---

## 1. Resumen Ejecutivo

EduApp es una plataforma educativa web que utiliza inteligencia artificial para crear experiencias de aprendizaje personalizadas. Los docentes crean cursos subiendo material (PDF, DOCX, TXT, URLs de YouTube) y la IA genera automáticamente roadmaps de aprendizaje con lecciones, quizzes y exámenes. Los estudiantes aprenden con un tutor IA integrado, ganan XP, desbloquean medallas y compiten en el Coliseo de Retos. Los padres pueden monitorear el progreso de sus hijos en tiempo real.

---

## 2. Roles de Usuario

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Estudiante** | Consume contenido, realiza evaluaciones, interactúa con IA | Dashboard, Roadmap, Lecciones, Quizzes, Coliseo, Logros |
| **Docente** | Crea cursos, sube material, supervisa progreso, valida contenido IA | Panel Docente, Diseñador de Roadmap, Revisión de Contenido |
| **Padre** | Monitorea progreso de estudiantes vinculados (solo lectura) | Panel Familiar, Reportes |
| **Admin** | Gestiona plataforma y usuarios globales | Panel de Administración |

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Frontend | React + Vite | React 19, Vite 8 | SPA con enrutamiento cliente |
| Routing | react-router-dom | 7.15 | Navegación por hash |
| Animaciones | framer-motion | 12.38 | Transiciones de página, micro-interacciones |
| Iconos | lucide-react | 1.14 | Iconografía vectorial |
| Gráficos | recharts | 3.8 | Gráficos de analytics (panel padre/docente) |
| Sanitización | DOMPurify | 3.4 | Seguridad de contenido IA |
| Markdown | marked | 18.0 | Renderizado de lecciones |
| Backend (BaaS) | **Supabase** | — | Auth, Postgres, Storage, Edge Functions, pgvector, Realtime |
| LLM (texto) | **NVIDIA AI** | `moonshotai/kimi-k2.6` | Chat, lecciones, quizzes, roadmaps, análisis de errores |
| Embeddings | **Google Gemini** | `gemini-embedding-001` (768 dims) | Búsqueda semántica vectorial (RAG) |
| Backend auxiliar | Express.js | 4.21 | Servidor proxy para streaming y voz |

### Modelos de IA utilizados

| Proveedor | Modelo | Uso específico | Endpoint |
|-----------|--------|---------------|----------|
| NVIDIA AI | `moonshotai/kimi-k2.6` | Tutor IA (chat), generación de lecciones, quizzes, roadmaps, análisis de errores, refuerzo, medallas SVG | `integrate.api.nvidia.com/v1/chat/completions` |
| Google AI | `gemini-embedding-001` | Embeddings vectoriales para búsqueda semántica (RAG) — solo vectores, nunca chat | `generativelanguage.googleapis.com` |

---

## 4. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React 19)             │
│  src/lib/llm.js ──────────────► Edge Functions (fetch)   │
│  src/lib/gemini.js ───────────► NVIDIA API (directo)     │
│  src/lib/supabase.js ─────────► Supabase BaaS            │
└────────┬────────────────────────────┬────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────┐    ┌──────────────────────────┐
│  SUPABASE (BaaS)    │    │  EDGE FUNCTIONS (Deno)    │
│  • Auth + OTP       │    │  15 funciones serverless   │
│  • Postgres         │    │  • chat (IA streaming)     │
│  • pgvector (RAG)   │    │  • generate-* (contenido)  │
│  • Storage          │    │  • embed-source (RAG)      │
│  • Realtime         │    │  • analyze-error           │
│  • RLS (Row Level   │    │  • reinforce               │
│    Security)        │    │                            │
└──────────────────────┘    └──────────┬─────────────────┘
                                       │
                  ┌────────────────────┤
                  ▼                    ▼
     ┌──────────────────┐   ┌──────────────────┐
     │  NVIDIA AI        │   │  Google AI        │
     │  kimi-k2.6        │   │  gemini-embedding │
     │  (chat + texto)   │   │  (vectores RAG)   │
     └──────────────────┘   └──────────────────┘
```

### Flujo de datos
1. **CRUD / Auth / Búsqueda vectorial** → Frontend ↔ Supabase directamente
2. **Generación de texto (LLM)** → Frontend → Edge Function → NVIDIA API
3. **Embeddings (RAG)** → Edge Function → Google Gemini API
4. **Archivos** → Frontend → Edge Function (upload-source) → Supabase Storage

---

## 5. Base de Datos (11 tablas)

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Perfiles de usuario (extiende `auth.users`). Roles: `student`, `teacher`, `parent`, `admin` |
| `courses` | Cursos creados por docentes (título, categoría, nivel, rigor, estado, código de invitación) |
| `nodes` | Nodos del roadmap (theory, quiz, practice, boss, reward). Posición, contenido, estado |
| `enrollments` | Inscripciones estudiante ↔ curso (UNIQUE student_id + course_id) |
| `progress` | Progreso por nodo: estados `locked`, `available`, `in_progress`, `completed`. Score, intentos |
| `source_files` | Archivos fuente subidos por docentes (PDF, DOCX, TXT, YouTube URLs) |
| `documents` | Chunks de texto con embeddings vectoriales (pgvector) para búsqueda semántica RAG |
| `weaknesses` | Matriz de debilidades del estudiante por concepto y curso |
| `medals` | Medallas obtenidas (tipo, rareza, SVG, fecha) |
| `notifications` | Notificaciones in-app (tipos: `parent_request`, `medal`, `progress`, `quiz_result`, `enrollment`, `new_student`, etc.) |
| `parent_links` | Vinculación padre-estudiante (pending/accepted) |

---

## 6. Edge Functions (15 funciones serverless)

| Función | Propósito | Streaming | RAG |
|---------|-----------|-----------|-----|
| `chat` | Tutor IA del estudiante con contexto del curso | **Sí** | **Sí** |
| `generate-lesson` | Generar contenido teórico de un nodo | **Sí** | **Sí** |
| `generate-quiz` | Generar preguntas de quiz para un nodo | No | **Sí** |
| `generate-test` | Generar examen de unidad (10 preguntas) | No | No |
| `generate-coliseo` | Generar desafío del Coliseo (20 preguntas) | No | No |
| `generate-roadmap` | Generar roadmap completo del curso desde material fuente | No | No |
| `generate-course-content` | Generar contenido en lote para todos los nodos | No | No |
| `generate-medal-svg` | Generar SVG dinámico de medalla | No | No |
| `chat-roadmap` | Asistente IA para docente (editar roadmap) | No | No |
| `analyze-error` | Análisis de respuesta incorrecta del estudiante | No | No |
| `reinforce` | Refuerzo con explicación alternativa | **Sí** | **Sí** |
| `register-user` | Crear cuenta de usuario (simula verificación email) | No | No |
| `upload-source` | Subir archivo fuente a Supabase Storage | No | No |
| `embed-source` | Pipeline ETL: archivo → texto → chunks → embeddings | No | **Sí** |
| `youtube-transcript` | Extraer transcripción de video de YouTube | No | No |

---

## 7. Sistema de Gamificación

### 7.1 Experiencia (XP)

| Acción | XP otorgado |
|--------|-------------|
| Completar lección teórica | +20 XP |
| Quiz normal aprobado (≥60%) | +30 XP |
| Quiz perfecto (100%) | +50 XP |
| Examen final (boss) aprobado | +80 XP |
| Coliseo — victoria normal | +100 XP + 20 por acierto |
| Coliseo — reto del día | +200 XP + 40 por acierto |

### 7.2 Niveles de Mascota

| Nivel | XP requerido | Descripción |
|-------|-------------|-------------|
| Nivel 1 | 0 – 500 XP | Bebé |
| Nivel 2 | 501 – 1500 XP | Juvenil |
| Nivel 3 | 1501+ XP | Adulto (máximo) |

### 7.3 Medallas y Logros (18 logros)

#### Maestría (10 logros)
| Logro | Condición | Rareza |
|-------|-----------|--------|
| Primer Paso | Completar primer quiz | Común |
| Mente Brillante | 100% en un quiz | Rara |
| Estudiante Dedicado | 5 quizzes completados | Rara |
| Evaluador Experto | 10 quizzes completados | Épica |
| Guerrero del Conocimiento | Aprobar examen final | Épica |
| Perfeccionista | 100% en todos los quizzes de un curso | Legendaria |
| Mente Curiosa | Inscrito en 3 cursos | Rara |
| Explorador | 10 nodos de teoría completados | Común |
| Campeón del Coliseo | Ganar Coliseo de Retos | Épica |
| Leyenda del Coliseo | Ganar Coliseo sin perder vidas | Legendaria |
| Primer Curso | Completar primer curso | Rara |

#### Comportamiento (7 logros)
| Logro | Condición | Rareza |
|-------|-----------|--------|
| Buen Hábito | 3 días seguidos de estudio | Común |
| Racha Imparable | 7 días seguidos de estudio | Épica |
| Velocista | Quiz en < 2 min con > 80% | Rara |
| Noctámbulo | Estudiar después de las 10 PM | Común |
| Aprendiz Reflexivo | Revisar errores por primera vez | Común |
| Compañero de Estudio | Usar el tutor IA por primera vez | Común |
| Dependiente de IA | 10 interacciones con el tutor | Rara |

### 7.4 Rarezas

| Rareza | Color | Descripción |
|--------|-------|-------------|
| Común | `#A6A6BC` (gris) | Logros básicos |
| Rara | `#3B82F6` (azul) | Logros intermedios |
| Épica | `#8B5CF6` (púrpura) | Logros avanzados |
| Legendaria | `#F59E0B` (ámbar) | Logros máximos |

---

## 8. Fórmula de Nivel de Entendimiento (Sincronía)

```
S = (P × 0.50) + (Nc × 0.25) + (Er × 0.15) + (Te × 0.10)
```

| Variable | Significado | Cálculo | Peso |
|----------|-------------|---------|------|
| **P** | Desempeño en quizzes | `min(avgScore / 100, 1)`. Si no hay quizzes, usa Nc | **50%** |
| **Nc** | Nodos completados | `nodos_completados / total_nodos` | **25%** |
| **Er** | Ratio de aciertos | `aciertos / (aciertos + errores)`. Sin datos = 1 | **15%** |
| **Te** | Esfuerzo de estudio | `min(horas_estudio / 2, 1)` | **10%** |

### Rangos de Entendimiento

| Rango | Color | Etiqueta | Significado |
|-------|-------|----------|-------------|
| 0 – 30% | Rojo `#EF4444` | **Inicial** | Requiere refuerzo intensivo |
| 31 – 60% | Naranja `#F97316` | **En progreso** | Avanzando, necesita práctica |
| 61 – 85% | Azul `#3B82F6` | **Competente** | Buen dominio de los temas |
| 86 – 100% | Púrpura `#8B5CF6` | **Avanzado** | Maestría del contenido |

### Comportamiento del modelo IA según nivel

| Nivel | Temperatura LLM | Formalidad |
|-------|-----------------|------------|
| **Inicial** (≤30%) | 0.7 (más creativo) | Lenguaje muy simple, como explicar a un niño |
| **En progreso** (31-70%) | 0.5 (balanceado) | Lenguaje estándar, ejemplos prácticos |
| **Avanzado** (>70%) | 0.3 (más preciso) | Lenguaje técnico, formal y preciso |

---

## 9. Flujos Principales

### 9.1 Flujo del Estudiante

```
Login → Dashboard → Roadmap del curso → Lección teórica → Quiz
                                                    ↓
                                              ¿Aprobó (≥60%)?
                                              ↙            ↘
                                           Siguiente     Review Hub
                                            nodo         (análisis IA
                                                         + refuerzo)
```

1. **Dashboard**: Saludo dinámico, card "Continuar" (último curso activo), retos del día, cursos inscritos
2. **Roadmap**: Camino serpiente SVG con nodos de teoría/quiz/boss. Estados visuales: bloqueado, disponible, en progreso, completado
3. **Lección**: Contenido generado por IA con efecto typewriter, palabras clave resaltadas, chat con tutor IA
4. **Quiz**: 3-5 preguntas generadas por IA, timer 30s por pregunta, tipos: opción múltiple y verdadero/falso
5. **Resultado**: Score ring, XP ganado, navegación al siguiente nodo o revisión de errores
6. **Review Hub**: Análisis de error por IA, input de pregunta libre al tutor, video recomendado
7. **Coliseo**: Examen integrador con sistema de vidas (❤️❤️❤️), preguntas de todos los nodos completados

### 9.2 Flujo del Docente

```
Panel Docente → Crear curso → Subir material → Generar Roadmap (IA)
                                              ↓
                              Revisar/Editar nodos → Publicar
                                              ↓
                              Dashboard de estudiantes → Ver progreso individual
```

1. **Panel Docente**: Cards de cursos, estadísticas, alertas de estudiantes
2. **Crear curso**: Formulario (título, categoría, nivel, rigor 1-5), upload de archivos (PDF, DOCX, TXT, YouTube)
3. **Generar Roadmap**: La IA analiza el material fuente y crea automáticamente nodos de teoría y quizzes
4. **RoadmapDesigner**: Editor visual con chat IA para modificar nodos ("Agrega un quiz después del nodo 3")
5. **ContentReview**: Revisar, aprobar, regenerar o rechazar contenido generado por IA antes de publicar
6. **Gestión de estudiantes**: Ver progreso individual, dificultades detectadas, actividad reciente

### 9.3 Flujo del Padre

```
Panel Familiar → Vincular estudiante (email) → Ver progreso en tiempo real
                                              ↓
                              Estadísticas: entendimiento, lecciones, actividad
```

---

## 10. Navegación y Pantallas

| # | Pantalla | URL | Rol | Descripción |
|---|----------|-----|-----|-------------|
| 1 | Login | `/login` | Todos | Email + contraseña, magic link |
| 2 | Registro | `/register` | Todos | Wizard 3 pasos con selección de rol |
| 3 | Recuperar contraseña | `/forgot-password` | Todos | Envío de enlace mágico |
| 4 | Onboarding Accesibilidad | `/onboarding/accessibility` | Estudiante | Toggles de accesibilidad |
| 5 | Onboarding Avatar | `/onboarding/avatar` | Estudiante | Selección de mascota y avatar |
| 6 | Dashboard | `/dashboard` | Estudiante | Panel principal con retos y cursos |
| 7 | Explorar Cursos | `/explore` | Estudiante | Catálogo público, inscripción por código |
| 8 | Roadmap | `/roadmap/:courseId` | Estudiante, Docente | Camino serpiente SVG interactivo |
| 9 | Lección | `/lesson/:courseId/:nodeId` | Estudiante, Docente | Contenido teórico con tutor IA |
| 10 | Quiz | `/quiz/:courseId/:nodeId` | Estudiante, Docente | Evaluación adaptativa con timer |
| 11 | Resultado Quiz | `/quiz/result` | Estudiante, Docente | Score, revisión de errores |
| 12 | Corrección | `/review/:courseId/:nodeId` | Estudiante, Docente | Análisis de errores + hub de refuerzo |
| 13 | Coliseo | `/coliseo/:courseId` | Estudiante, Docente | Examen final con vidas y XP |
| 14 | Logros | `/achievements` | Estudiante | Grid de medallas (18 logros) |
| 15 | Perfil | `/profile` | Todos | Datos personales, avatar, mascota |
| 16 | Configuración | `/settings` | Todos | Preferencias y accesibilidad |
| 17 | Panel Docente | `/teacher` | Docente | Cursos, estadísticas, alertas |
| 18 | Diseñar Roadmap | `/teacher/design/:courseId` | Docente | Editor visual con chat IA |
| 19 | Revisar Contenido | `/teacher/courses/:courseId/review` | Docente | Aprobar/rechazar contenido IA |
| 20 | Panel Familiar | `/parent` | Padre | Progreso de estudiantes vinculados |

---

## 11. Accesibilidad (WCAG 2.1 AA)

| Característica | Descripción |
|----------------|-------------|
| Alto contraste | Modo de contraste máximo, toggle en onboarding/settings |
| Reducir animaciones | Respeto de `prefers-reduced-motion` |
| Navegación por voz | Web Speech API, comandos globales ("Ir al dashboard", "Leer pantalla", etc.) |
| Texto grande | Aumento de font-size base a 18px |
| Modo daltónico | Paletas de color seguras (viridis/cividis) |
| Skip link | "Saltar al contenido principal" en cada página |
| Navegación por teclado | Tab order lógico, foco visible, atajos |
| Screen readers | NVDA, JAWS, VoiceOver — lista semántica del roadmap |
| ARIA labels | Labels explícitos en todos los elementos interactivos |
| Anuncios en vivo | `aria-live` para feedback de quiz, timer, notificaciones |
| No color como único indicador | Errores: X + texto + color; aciertos: check + texto + color |

### Comandos de voz disponibles
- "Ir al dashboard" / "Ir a logros" / "Ir a perfil"
- "Ir al curso [nombre]" — fuzzy matching
- "Siguiente nodo" / "Nodo anterior"
- "Leer pantalla" / "Leer contenido"
- "Leer notificaciones"
- "Ayuda" — lista comandos disponibles
- "¿Dónde estoy?" — ubicación actual en la app
- "Opción A/B/C/D" — responder quiz por voz

---

## 12. Seguridad

| Medida | Descripción |
|--------|-------------|
| Row Level Security (RLS) | Cada usuario solo ve sus propios datos en Supabase |
| Autenticación JWT | Tokens de acceso con expiración, refresh automático |
| Sanitización DOMPurify | Todo contenido IA es sanitizado antes de renderizar |
| CORS | Headers configurados en todas las Edge Functions |
| API Keys | NVIDIA API key y Gemini API key solo en backend (Edge Functions) |
| Contraseñas | Encriptadas con `pgcrypto` en la base de datos |

---

## 13. Cuentas de Prueba (Demo)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Estudiante | `default_student@eduapp.test` | `student123` |
| Docente | `default_teacher@eduapp.test` | `teacher123` |
| Padre | `default_parent@eduapp.test` | `parent123` |

---

## 14. Mapa de Módulos y Funcionalidades

```
EduApp
├── Auth
│   ├── Login (email/password + magic link)
│   ├── Registro (wizard 3 pasos)
│   ├── Recuperación de contraseña
│   └── Onboarding (accesibilidad + avatar/mascota)
│
├── Estudiante
│   ├── Dashboard (retos del día, continuar, cursos)
│   ├── Explorar (catálogo público, código de invitación)
│   ├── Roadmap (SVG interactivo, estados de nodos)
│   ├── Lección (typewriter, tutor IA integrado)
│   ├── Quiz (timer, opción múltiple, feedback IA)
│   ├── Review Hub (análisis de errores, pregunta IA, video)
│   ├── Coliseo (vidas, preguntas dinámicas, XP)
│   ├── Logros (18 medallas, rarezas)
│   ├── Perfil (avatar, mascota, XP)
│   └── Configuración (accesibilidad, notificaciones)
│
├── Docente
│   ├── Panel Docente (cursos, estadísticas, alertas)
│   ├── Crear curso (material, IA, roadmap)
│   ├── RoadmapDesigner (editor visual + chat IA)
│   ├── ContentReview (aprobar/rechazar/regenerar)
│   └── Gestión de estudiantes (progreso, dificultades)
│
├── Padre
│   ├── Panel Familiar (progreso en tiempo real)
│   ├── Vinculación de estudiantes (email, notificaciones)
│   └── Gráficos de actividad semanal
│
├── IA
│   ├── Tutor (chat con RAG, streaming)
│   ├── Generación de contenido (lecciones, quizzes, roadmaps)
│   ├── Análisis de errores (explicación personalizada)
│   ├── Refuerzo (pregunta libre al tutor)
│   ├── Embeddings RAG (búsqueda semántica vectorial)
│   └── Ajuste de formalidad (según nivel de entendimiento)
│
└── Gamificación
    ├── XP (experiencia por actividad)
    ├── Niveles de mascota (1-3)
    ├── Medallas (18 logros, 4 rarezas)
    ├── Retos del día (2 diarios dinámicos)
    └── Coliseo de Retos (examen integrador)
```
