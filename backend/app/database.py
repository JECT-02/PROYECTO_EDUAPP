from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from sqlalchemy import text
from app.config import get_settings
import logging
import sys

logger = logging.getLogger("eduapp.database")

settings = get_settings()

# Validate that DATABASE_URL is set
if not settings.DATABASE_URL or "postgresql" not in settings.DATABASE_URL:
    logger.error("=" * 60)
    logger.error("ERROR CRITICO: DATABASE_URL no esta configurada correctamente en backend/.env")
    logger.error(f"Valor actual: {settings.DATABASE_URL}")
    logger.error("El valor debe ser similar a:")
    logger.error("  DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/eduapp")
    logger.error("=" * 60)
    sys.exit(1)

logger.info(f"Conectando a base de datos: {settings.DATABASE_URL}")

try:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True  # Verifica conexion antes de usarla
    )
    logger.info("Motor de base de datos creado exitosamente")
except Exception as e:
    logger.error(f"Error al crear motor de base de datos: {e}")
    sys.exit(1)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except OperationalError as e:
            logger.error(f"Error operacional de base de datos: {e}")
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error de SQLAlchemy: {e}")
            raise

async def check_db_connection() -> tuple[bool, str]:
    """Verifica que la conexion a la base de datos funcione."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Conexion a base de datos VERIFICADA exitosamente")
        return True, "Conexion exitosa"
    except OperationalError as e:
        error_msg = str(e).lower()
        if "could not connect to server" in error_msg or "connection refused" in error_msg:
            hint = "PostgreSQL no esta corriendo. Ejecuta 'iniciar.bat' para iniciarlo."
        elif "does not exist" in error_msg and "database" in error_msg:
            hint = "La base de datos 'eduapp' no existe. Ejecuta 'instalar.bat' para crearla."
        elif "authentication failed" in error_msg:
            hint = "Credenciales de PostgreSQL incorrectas. Revisa DATABASE_URL en backend/.env"
        else:
            hint = f"Error de conexion: {e}"
        logger.error(f"Fallo al conectar a BD: {hint}")
        return False, hint
    except Exception as e:
        logger.error(f"Error inesperado al verificar BD: {e}")
        return False, str(e)
