import asyncio
from app.database import AsyncSessionLocal, engine, Base
from app.models import Badge

async def seed_badges():
    async with AsyncSessionLocal() as db:
        # Check if badges exist
        from sqlalchemy.future import select
        res = await db.execute(select(Badge))
        if res.scalars().first():
            print("Badges already seeded.")
            return

        badges = [
            Badge(name="Primer Paso", description="Completa tu primer nodo", icon_id="star", category="mastery", rarity="common", condition_type="nodes_completed", condition_value=1),
            Badge(name="Estudiante Constante", description="Mantén una racha de 3 días", icon_id="fire", category="behavioral", rarity="rare", condition_type="streak_days", condition_value=3),
            Badge(name="Maestro de la Práctica", description="Aprueba 5 cuestionarios seguidos", icon_id="trophy", category="mastery", rarity="epic", condition_type="quizzes_passed_streak", condition_value=5),
        ]
        db.add_all(badges)
        await db.commit()
        print("Seeded basic badges.")

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_badges()

if __name__ == "__main__":
    asyncio.run(main())
