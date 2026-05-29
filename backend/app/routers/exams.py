from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, ExamSession, ColosseoAttempt
from app.schemas import BaseSchema
from app.dependencies import require_role
from datetime import datetime

router = APIRouter(prefix="/api/courses", tags=["exams_coliseo"])

class StartExamRequest(BaseSchema):
    pass

class SubmitExamRequest(BaseSchema):
    answers: dict
    time_taken: int

@router.post("/{course_id}/nodes/{node_id}/exam/start")
async def start_exam(
    course_id: str, node_id: str,
    current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    session = ExamSession(student_id=current_user.id, course_id=course_id, node_id=node_id, exam_type="unit_test")
    db.add(session)
    await db.commit()
    return {"message": "Exam started", "session_id": session.id}

@router.post("/{course_id}/nodes/{node_id}/exam/submit")
async def submit_exam(
    course_id: str, node_id: str, request: SubmitExamRequest,
    current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    # Simplified logic
    return {"score": 0.8, "passed": True, "xp_earned": 50, "new_sync_score": current_user.sync_score}

@router.get("/{course_id}/coliseo/status")
async def coliseo_status(
    course_id: str, current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    # Simplified check
    return {"unlocked": True, "locked_until": None, "attempts_left": 3}

@router.post("/{course_id}/coliseo/start")
async def start_coliseo(
    course_id: str, current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    attempt = ColosseoAttempt(student_id=current_user.id, course_id=course_id, lives_remaining=3)
    db.add(attempt)
    await db.commit()
    return {"message": "Coliseo started", "attempt_id": attempt.id, "lives": 3}

@router.post("/{course_id}/coliseo/submit")
async def submit_coliseo(
    course_id: str, request: dict,
    current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    return {"score": 0.9, "passed": True, "xp_earned": 100, "new_sync_score": current_user.sync_score}
