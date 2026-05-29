"""
EduApp - Database Setup
=======================
Crea la base de datos PostgreSQL 'eduapp' si no existe
y ejecuta seed_data para crear las tablas.

Uso:
    python scripts/setup_db.py

Requiere:
    - PostgreSQL instalado y servicio corriendo
"""

import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import psycopg2
except ImportError:
    print("Instalando psycopg2-binary...")
    os.system("pip install psycopg2-binary")
    import psycopg2

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
}


def create_database():
    conn = psycopg2.connect(dbname="postgres", **DB_CONFIG)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='eduapp'")
    if not cur.fetchone():
        cur.execute('CREATE DATABASE eduapp ENCODING "UTF8"')
        print("[OK] Base de datos 'eduapp' creada.")
    else:
        print("[OK] Base de datos 'eduapp' ya existe.")
    cur.close()
    conn.close()


def check_connection():
    try:
        conn = psycopg2.connect(dbname="eduapp", **DB_CONFIG)
        conn.close()
        print("[OK] Conexion a eduapp exitosa.")
        return True
    except Exception as e:
        print(f"[ERROR] Conexion fallo: {e}")
        return False


def run_seed():
    from app.database import engine, Base
    import asyncio
    # Import all models so they register on Base.metadata
    from app import models  # noqa: F401

    async def seed():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Tablas creadas exitosamente.")

    asyncio.run(seed())


if __name__ == "__main__":
    print("=== Configuracion de Base de Datos EduApp ===\n")
    create_database()
    if check_connection():
        print("\nCreando tablas...")
        run_seed()
    print("\n=== Listo! PostgreSQL configurado ===")
