"""
EduApp - Database Setup
=======================
Crea la base de datos 'eduapp' si no existe,
conecta con PostgreSQL para crear las tablas y relaciones.

Uso:
    python scripts/setup_db.py

Requiere:
    - PostgreSQL instalado y accesible en 127.0.0.1:5432
    - Credenciales: postgres / postgres
"""

import sys
import os
import time
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ──────────────────────────────────────────────
# 1. Asegurar psycopg2
# ──────────────────────────────────────────────
try:
    import psycopg2
except ImportError:
    print("[INFO] Instalando psycopg2-binary...")
    os.system("pip install psycopg2-binary -q")
    import psycopg2

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
}


def detect_postgresql(retries=3, delay=2):
    """
    Intenta conectar al servidor PostgreSQL varias veces.
    Si falla, imprime diagnósticos útiles.
    """
    print(f"  Conectando a PostgreSQL en {DB_CONFIG['host']}:{DB_CONFIG['port']}...")

    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(dbname="postgres", **DB_CONFIG, connect_timeout=5)
            conn.close()
            print("  [OK] Conexion a PostgreSQL exitosa.")
            return True
        except psycopg2.OperationalError as e:
            err = str(e).lower()
            if attempt < retries:
                print(f"  [INTENTO {attempt}/{retries}] No se pudo conectar. Reintentando en {delay}s...")
                time.sleep(delay)
            else:
                print("  [ERROR] No se pudo conectar a PostgreSQL.")
                print()
                print("  ─── Posibles causas ──────────────────────")
                if "connection refused" in err or "could not connect" in err:
                    print("  1. PostgreSQL NO esta corriendo.")
                    print("     → Abre Services (services.msc), busca el servicio PostgreSQL")
                    print("       e iniciało manualmente.")
                    print("     → O ejecuta: net start postgresql-x64-16 (o la version que tengas)")
                    print("     → Si usas Docker: docker start postgres")
                elif "does not exist" in err:
                    print("  1. La base de datos 'postgres' no existe. Raro: recrea el cluster.")
                    print("     → Ejecuta: pg_ctlcluster 16 main start")
                elif "authentication failed" in err:
                    print("  1. Credenciales incorrectas.")
                    print("     → Deben ser: usuario=postgres password=postgres")
                    print("     → Si cambiaste la contraseña, edita este script y backend/.env")
                else:
                    print(f"  1. {e}")
                print("  2. PostgreSQL escucha en otro puerto (no 5432).")
                print("     → Revisa: SHOW port; en psql o el archivo postgresql.conf")
                print("  3. El firewall bloquea el puerto 5432.")
                print("  ────────────────────────────────────────────")
                print()
                return False


def create_database_if_not_exists():
    """Crea la BD 'eduapp' si aun no existe."""
    conn = psycopg2.connect(dbname="postgres", **DB_CONFIG, connect_timeout=5)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM pg_database WHERE datname='eduapp'")
    if cur.fetchone():
        print("  [OK] Base de datos 'eduapp' ya existe.")
    else:
        cur.execute('CREATE DATABASE eduapp ENCODING "UTF8"')
        print("  [OK] Base de datos 'eduapp' CREADA exitosamente.")

    cur.close()
    conn.close()


async def run_async_steps():
    """
    Corrida async unificada: crea tablas y luego seed.
    Un solo event loop evita el error 'Event loop is closed'.
    Al final, dispose() del engine para evitar RuntimeWarning
    sobre coroutines "never awaited" cuando se cierra el loop.
    """
    from app.database import engine, Base
    from app import models  # noqa: F401 — registra modelos en Base.metadata

    try:
        # ── 3. Crear tablas ──
        print()
        print("[3/4] Creando tablas y relaciones...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("  [OK] Tablas y relaciones creadas/verificadas.")

        # ── 4. Seed de datos demo ──
        print()
        print("[4/4] Sembrando datos de prueba...")
        try:
            import seed_data
            await seed_data.main()
            print("  [OK] Datos de prueba sembrados.")
        except Exception as e:
            print(f"  [AVISO] Seed de datos no completado (no critico): {e}")

        return True

    finally:
        # Liberar pool de conexiones antes de cerrar el event loop
        await engine.dispose()


if __name__ == "__main__":
    print()
    print("═" * 60)
    print("  Configuracion de Base de Datos - EduApp")
    print("═" * 60)
    print()

    exit_code = 0

    # 1. Conectar a PostgreSQL (sync, ok)
    print("[1/4] Verificando PostgreSQL...")
    if not detect_postgresql(retries=3, delay=2):
        print()
        print("  No se pudo conectar a PostgreSQL.")
        print("  Asegúrate de que PostgreSQL esté instalado y corriendo.")
        print("  Luego ejecuta este script nuevamente.")
        print()
        sys.exit(1)

    # 2. Crear base de datos (sync, ok)
    print()
    print("[2/4] Verificando base de datos 'eduapp'...")
    try:
        create_database_if_not_exists()
    except Exception as e:
        print(f"  [ERROR] No se pudo crear la base de datos: {e}")
        print("  ¿Tienes permisos de superusuario en PostgreSQL?")
        sys.exit(1)

    # 3 + 4: Corrida async unificada (un solo event loop)
    ok = asyncio.run(run_async_steps())

    print()
    print("═" * 60)
    if ok:
        print("  LISTO — Base de datos configurada correctamente")
    else:
        print("  ERROR — Base de datos NO configurada")
    print("═" * 60)
    print()
    if ok:
        print("  Credenciales de prueba:")
        print("    Estudiante: estudiante1@demo.com / demo123")
        print("    Docente:    docente@demo.com / demo123")
        print("    Padre:      padre@demo.com / demo123")
        print()
    
    sys.exit(0 if ok else 1)
