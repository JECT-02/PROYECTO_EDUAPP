from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, Course, Enrollment, StudentActivity
from app.dependencies import require_role
from typing import List

router = APIRouter(prefix="/api/teacher", tags=["teacher"])

@router.get("/dashboard")
async def get_teacher_dashboard(
    current_user: User = Depends(require_role(["teacher"])), db: AsyncSession = Depends(get_db)
):
    c_res = await db.execute(select(Course).filter(Course.teacher_id == current_user.id))
    courses = c_res.scalars().all()
    return {
        "greeting": f"Bienvenido, Profesor {current_user.name}",
        "courses": [{"id": c.id, "title": c.title, "status": c.status} for c in courses]
    }

@router.post("/courses")
async def create_course(
    request: dict,
    current_user: User = Depends(require_role(["teacher"])), db: AsyncSession = Depends(get_db)
):
    c = Course(
        teacher_id=current_user.id, title=request.get("title", "Nuevo Curso"),
        description=request.get("description", ""), category=request.get("category", "General"),
        age_level=request.get("age_level", "All")
    )
    db.add(c)
    await db.commit()
    return {"id": c.id, "message": "Course created"}
