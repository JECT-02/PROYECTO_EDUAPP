from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, ParentStudentLink
from app.dependencies import require_role

router = APIRouter(prefix="/api/parent", tags=["parent"])

@router.get("/dashboard")
async def get_parent_dashboard(
    current_user: User = Depends(require_role(["parent"])), db: AsyncSession = Depends(get_db)
):
    links_res = await db.execute(select(ParentStudentLink).filter(
        ParentStudentLink.parent_id == current_user.id, ParentStudentLink.status == "accepted"))
    links = links_res.scalars().all()
    
    students = []
    for link in links:
        s_res = await db.execute(select(User).filter(User.id == link.student_id))
        student = s_res.scalars().first()
        if student:
            students.append({"id": student.id, "name": student.name, "sync_score": student.sync_score})
            
    return {
        "greeting": f"Hola, {current_user.name}",
        "students": students
    }
