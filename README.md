# EduApp

Plataforma educativa web con inteligencia artificial tutor, gamificación y accesibilidad WCAG 2.1 AA.

Permite a docentes crear cursos con roadmaps generados por IA, y a estudiantes aprender con un tutor inteligente que responde basándose en el material de clase.

## Stack

- **Frontend:** React 19 + Vite 8 + react-router-dom 7
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, pgvector)
- **IA (texto):** NVIDIA AI — `moonshotai/kimi-k2.6`
- **Embeddings (RAG):** Google Gemini — `gemini-embedding-001`
- **CSS:** Archivos CSS por componente (sin Tailwind)

## Requisitos previos

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Cuenta en [NVIDIA AI](https://build.nvidia.com/) (API key)
- Cuenta en [Google AI Studio](https://aistudio.google.com/) (API key para embeddings)
- Windows (los scripts de inicio son `.bat`)

## Instalación

```bash
# Clonar el repositorio
git clone <url>
cd PROYECTO_EDUAPP

# Instalar dependencias + Supabase CLI
instalar.bat
```

## Configuración

1. Copia `.env.example` a `.env` y completa las variables:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_ACCESS_TOKEN=sbp_tu-access-token
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SUPABASE_PROJECT_ID=tu-project-ref
NVIDIA_API_KEY=nvapi-tu-api-key
GEMINI_API_KEY=AIza-tu-api-key
```

## Ejecución

```bash
# Iniciar todo (Supabase + Edge Functions + AI Backend + Vite)
iniciar.bat
```

Esto levanta:
- Frontend: `http://localhost:5173`
- AI Backend: `http://localhost:3001`

### Cuentas de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Estudiante | `default_student@eduapp.test` | `student123` |
| Docente | `default_teacher@eduapp.test` | `teacher123` |
| Padre | `default_parent@eduapp.test` | `parent123` |

## Comandos

| Comando | Descripción |
|---------|-------------|
| `instalar.bat` | Instala dependencias y Supabase CLI |
| `iniciar.bat` | Inicia todo el entorno de desarrollo |
| `npm run dev` | Solo el frontend (Vite) |
| `npm run build` | Build de producción |
| `npm run lint` | Linting con ESLint |
| `node scripts/test-e2e-teacher-student.mjs` | Tests end-to-end |

## Estructura

```
src/                    # Frontend React
├── components/         # Componentes compartidos
├── context/            # Estado global (AuthContext)
├── lib/                # Utilidades (supabase, api, llm, etc.)
├── pages/              # 20 páginas (una por feature)
└── utils/              # Sounds, vibration

supabase/               # Backend
├── functions/          # 15 Edge Functions (Deno)
│   └── _shared/        # Utilidades compartidas
└── migrations/         # Migraciones SQL

ai-backend/             # Express.js auxiliar
scripts/                # Tests y utilidades
docs/                   # Documentación
```

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `AGENTS.md` | Guía para modelos de IA |
| `docs/DESIGN.md` | Sistema de diseño UI |
| `docs/ARCHITECTURE.md` | Arquitectura técnica |
| `docs/SPEC.md` | Requerimientos funcionales (31 RF) |
| `docs/DEMO.md` | Datos de prueba y scripts |
| `docs/STATUS.md` | Estado actual y deuda técnica |

## Licencia

Proyecto universitario — ver repositorio para detalles.
![Visitas](https://komarev.com)

