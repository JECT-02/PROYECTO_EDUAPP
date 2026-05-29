from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, Node, StudentActivity, Enrollment
from app.schemas import LessonResponse, ReadingProgressRequest
from app.dependencies import require_role
from app.services.ai_engine import generate_lesson_content
from app.services.rag_service import retrieve_context
from app.utils.exceptions import NotFoundException, ForbiddenException
from datetime import datetime

router = APIRouter(prefix="/api/courses", tags=["lessons"])

@router.get("/{course_id}/nodes/{node_id}/lesson", response_model=LessonResponse)
async def get_lesson(
    course_id: str,
    node_id: str,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    # Verify enrollment
    enr_res = await db.execute(select(Enrollment).filter(
        Enrollment.student_id == current_user.id, Enrollment.course_id == course_id))
    if not enr_res.scalars().first():
        raise ForbiddenException(code="NOT_ENROLLED", detail="Not enrolled")
        
    # Get node
    node_res = await db.execute(select(Node).filter(Node.id == node_id, Node.course_id == course_id))
    node = node_res.scalars().first()
    if not node or node.node_type != "theory":
        raise NotFoundException(code="NODE_NOT_FOUND", detail="Theory node not found")
        
    # Get/update activity
    act_res = await db.execute(select(StudentActivity).filter(
        StudentActivity.student_id == current_user.id, StudentActivity.node_id == node_id))
    activity = act_res.scalars().first()
    
    if not activity or activity.status == "locked":
        raise ForbiddenException(code="NODE_LOCKED", detail="Node is locked")
        
    if activity.status == "available":
        activity.status = "in_progress"
        activity.started_at = datetime.now()
        await db.commit()
        
    # Check if we have pre-generated approved content
    if node.teacher_review_status == "approved" and node.ai_content:
        content_html = node.ai_content.get("content_html", "")
        key_concepts = node.ai_content.get("key_concepts", [])
    else:
        # Generate on the fly (for MVP or unapproved)
        context = await retrieve_context(course_id, node.title, db)
        gen_data = await generate_lesson_content(node.title, context, current_user.sync_score or 0)
        content_html = gen_data.get("content_html", "")
        key_concepts = gen_data.get("key_concepts", [])
        
        # Save generated content if node doesn't have it
        if not node.ai_content:
            node.ai_content = gen_data
            node.teacher_review_status = "pending"
            await db.commit()

    return LessonResponse(
        content_html=content_html,
        key_concepts=key_concepts,
        reading_percentage=activity.reading_percentage if activity else 0.0
    )

@router.put("/{course_id}/nodes/{node_id}/reading-progress")
async def update_reading_progress(
    course_id: str,
    node_id: str,
    request: ReadingProgressRequest,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    act_res = await db.execute(select(StudentActivity).filter(
        StudentActivity.student_id == current_user.id, StudentActivity.node_id == node_id))
    activity = act_res.scalars().first()
    
    if activity:
        # Only increase
        if request.reading_percentage > activity.reading_percentage:
            activity.reading_percentage = request.reading_percentage
        activity.reading_time_seconds += request.time_seconds
        activity.last_accessed_at = datetime.now()
        await db.commit()
        
    return {"message": "Progress updated"}
