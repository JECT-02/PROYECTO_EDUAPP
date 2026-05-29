from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.database import get_db
from app.models import User, Enrollment, Course, StudentActivity
from app.schemas import DashboardResponse
from app.dependencies import get_current_user, require_role
from datetime import datetime
import pytz

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

def get_greeting():
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "Buenos dias"
    elif 12 <= hour < 19:
        return "Buenas tardes"
    elif 19 <= hour <= 23:
        return "Buenas noches"
    else:
        return "Hola"

@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    # Greeting
    greeting = f"{get_greeting()}, {current_user.name}!"
    
    # Courses
    enrollments_res = await db.execute(
        select(Enrollment).filter(Enrollment.student_id == current_user.id)
    )
    enrollments = enrollments_res.scalars().all()
    
    course_responses = []
    continue_card = None
    
    for enr in enrollments:
        course_res = await db.execute(select(Course).filter(Course.id == enr.course_id))
        course = course_res.scalars().first()
        if not course:
            continue
            
        # Get teacher name
        teacher_res = await db.execute(select(User).filter(User.id == course.teacher_id))
        teacher = teacher_res.scalars().first()
        
        # Calculate progress
        activities_res = await db.execute(
            select(StudentActivity).filter(
                StudentActivity.student_id == current_user.id,
                StudentActivity.course_id == course.id
            )
        )
        activities = activities_res.scalars().all()
        
        total_nodes = len(activities) if activities else 10 # Approximation if no nodes generated
        completed_nodes = len([a for a in activities if a.status == "completed"])
        progress = (completed_nodes / total_nodes) if total_nodes > 0 else 0
        
        course_responses.append({
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "category": course.category,
            "status": "in_progress" if progress > 0 else "new",
            "teacherName": teacher.name if teacher else "Docente",
            "coverImage": course.cover_image,
            "progress": round(progress, 2),
            "lastActivity": activities[0].last_accessed_at if activities else None
        })
        
        # Find latest in_progress for continue_card
        for act in activities:
            if act.status == "in_progress":
                if not continue_card or (act.last_accessed_at and continue_card.get('last_accessed_at') and act.last_accessed_at > continue_card['last_accessed_at']):
                    continue_card = {
                        "courseId": course.id,
                        "courseTitle": course.title,
                        "nodeId": act.node_id,
                        "coverImage": course.cover_image,
                        "progress": round(progress, 2),
                        "last_accessed_at": act.last_accessed_at
                    }
                    
    # Format continue_card (remove internal sorting field)
    if continue_card:
        continue_card.pop('last_accessed_at', None)

    # Pet state
    pet_state = current_user.pet_data or {
        "base": "owl", "name": "Duo", "level": 1, 
        "xp_current": 0, "xp_next": 500, 
        "emotion": "normal", "accessories": []
    }
    
    return DashboardResponse(
        greeting=greeting,
        continue_card=continue_card,
        courses=course_responses,
        daily_challenges=[], # Empty for now
        pet=pet_state,
        sync_score=current_user.sync_score or 0.0,
        streak_days=1 # Placeholder for streak
    )
