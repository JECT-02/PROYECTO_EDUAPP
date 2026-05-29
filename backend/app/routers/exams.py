from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, ExamSession
from app.dependencies import require_role
from app.utils.exceptions import NotFoundException

router = APIRouter(prefix="/api/courses", tags=["exams"])

@router.get("/{course_id}/nodes/{node_id}/exam")
async def get_exam(
    course_id: str,
    node_id: str,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    # Verify exam session exists
    res = await db.execute(select(ExamSession).filter(
        ExamSession.student_id == current_user.id,
        ExamSession.node_id == node_id
    ))
    session = res.scalars().first()
    if not session:
        raise NotFoundException(code="EXAM_NOT_FOUND", detail="Exam session not found")
    
    return {
        "id": session.id,
        "exam_type": session.exam_type,
        "status": session.status,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "total_time_seconds": session.total_time_seconds,
        "final_score": session.final_score,
        "passed": session.passed,
        "lives_remaining": session.lives_remaining
    }
