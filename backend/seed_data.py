import asyncio
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Badge
from app.utils.security import hash_password
from sqlalchemy.future import select

DEMO_USERS = [
    # --- Estudiantes de prueba ---
    User(
        email="estudiante1@demo.com",
        hashed_password=hash_password("demo123"),
        name="Ana Martínez López",
        role="student",
        dni="12345678",
        age_group="15-17",
        email_verified=True,
        account_state="active",
        xp=450,
        sync_score=0.72,
    ),
    User(
        email="estudiante2@demo.com",
        hashed_password=hash_password("demo123"),
        name="Carlos García Ruiz",
        role="student",
        dni="23456789",
        age_group="11-14",
        email_verified=True,
        account_state="active",
        xp=280,
        sync_score=0.55,
    ),
    User(
        email="estudiante3@demo.com",
        hashed_password=hash_password("demo123"),
        name="Lucía Fernández Pérez",
        role="student",
        dni="34567890",
        age_group="7-10",
        email_verified=True,
        account_state="active",
        xp=150,
        sync_score=0.88,
    ),
    # --- Docente de prueba ---
    User(
        email="docente@demo.com",
        hashed_password=hash_password("demo123"),
        name="Prof. Roberto Sánchez",
        role="teacher",
        institution="Colegio Nacional Mixto",
        main_subject="Matemáticas",
        email_verified=True,
        account_state="active",
    ),
    # --- Padre/Tutor de prueba ---
    User(
        email="padre@demo.com",
        hashed_password=hash_password("demo123"),
        name="Fam. María López",
        role="parent",
        relationship="Madre",
        email_verified=True,
        account_state="active",
    ),
]


async def seed_badges():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Badge))
        if res.scalars().first():
            print("   Badges ya existen, saltando.")
            return

        badges = [
            Badge(name="Primer Paso", description="Completa tu primer nodo", icon_id="star", category="mastery", rarity="common", condition_type="nodes_completed", condition_value=1),
            Badge(name="Estudiante Constante", description="Mantén una racha de 3 días", icon_id="fire", category="behavioral", rarity="rare", condition_type="streak_days", condition_value=3),
            Badge(name="Maestro de la Práctica", description="Aprueba 5 cuestionarios seguidos", icon_id="trophy", category="mastery", rarity="epic", condition_type="quizzes_passed_streak", condition_value=5),
        ]
        db.add_all(badges)
        await db.commit()
        print("   Badges básicos creados.")


async def seed_demo_users():
    async with AsyncSessionLocal() as db:
        for user in DEMO_USERS:
            res = await db.execute(select(User).filter(User.email == user.email))
            existing = res.scalars().first()
            if existing:
                print(f"   Usuario {user.email} ya existe, saltando.")
            else:
                db.add(user)
                print(f"   Usuario {user.email} creado ({user.role}).")

        await db.commit()


async def main():
    print("=== Preparando base de datos EduApp ===\n")
    print("[1/3] Creando tablas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("   OK - Tablas listas\n")

    print("[2/3] Sembrando usuarios demo...")
    await seed_demo_users()
    print("   OK - Usuarios demo listos\n")

    print("[3/3] Sembrando badges...")
    await seed_badges()
    print("   OK - Badges listos\n")

    print("=" * 50)
    print("  Credenciales de prueba:")
    print("  ─────────────────────────────")
    print("  Estudiante: estudiante1@demo.com / demo123")
    print("  Estudiante: estudiante2@demo.com / demo123")
    print("  Estudiante: estudiante3@demo.com / demo123")
    print("  Docente:    docente@demo.com / demo123")
    print("  Padre:      padre@demo.com / demo123")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
