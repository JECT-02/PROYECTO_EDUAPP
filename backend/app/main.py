from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import get_settings
from app.routers import auth, onboarding, dashboard, courses, lessons, quizzes, exams, reinforcement, teacher, parent, accessibility, materials
from app.database import engine, Base, check_db_connection
import logging
import sys

# Configurar logging TEMPRANO
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout
)
logger = logging.getLogger("eduapp.main")

settings = get_settings()

# Initialize FastAPI
app = FastAPI(
    title="EduApp Backend API",
    description="Backend para la plataforma educativa EduApp",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "x-refresh-token", "x-timezone"],
)

# Exception handlers
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(dashboard.router)
app.include_router(courses.router)
app.include_router(lessons.router)
app.include_router(quizzes.router)
app.include_router(exams.router)
app.include_router(reinforcement.router)
app.include_router(teacher.router)
app.include_router(parent.router)
app.include_router(accessibility.router)
app.include_router(materials.router)

# Database initialization
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 50)
    logger.info("  Iniciando EduApp Backend...")
    logger.info("=" * 50)
    
    # 1. Verificar .env completo
    required_vars = {
        "DATABASE_URL": settings.DATABASE_URL,
        "SECRET_KEY": settings.SECRET_KEY,
        "GEMINI_API_KEY": settings.GEMINI_API_KEY,
        "FRONTEND_URL": settings.FRONTEND_URL,
    }
    
    for var_name, var_value in required_vars.items():
        if not var_value or var_value == "default_unsafe_secret_key_change_in_production":
            logger.warning(f"  [WARN] {var_name} no configurada o usa valor por defecto")
        else:
            masked = var_value[:8] + "..." if len(var_value) > 8 else var_value
            logger.info(f"  [OK]   {var_name} = {masked}")
    
    # 2. Verificar conexion a base de datos
    logger.info("  Verificando conexion a PostgreSQL...")
    db_ok, db_msg = await check_db_connection()
    if db_ok:
        logger.info("  [OK] Conexion a PostgreSQL exitosa")
        # Crear tablas si no existen
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("  [OK] Tablas verificadas/creadas")
        except Exception as e:
            logger.error(f"  [ERROR] No se pudieron crear las tablas: {e}")
    else:
        logger.error(f"  [ERROR] {db_msg}")
        logger.error("  El backend seguira iniciando pero las rutas que requieren BD fallaran.")
    
    # 3. Verificar Gemini API
    if not settings.GEMINI_API_KEY:
        logger.warning("  [WARN] GEMINI_API_KEY no configurada. La IA funcionara en modo simulado (mock).")
    else:
        logger.info(f"  [OK] GEMINI_API_KEY configurada (modelo: {getattr(settings, 'GEMINI_MODEL', 'gemini-2.0-flash')})")
    
    logger.info("=" * 50)

@app.get("/")
async def root():
    return {"message": "EduApp Backend API is running"}

@app.get("/health")
async def health_check():
    """Endpoint de salud para verificar el estado del backend."""
    db_ok, db_msg = await check_db_connection()
    ai_ok = bool(settings.GEMINI_API_KEY)
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": {"ok": db_ok, "message": db_msg},
        "gemini_api": {"configured": ai_ok},
        "frontend_url": settings.FRONTEND_URL,
    }
