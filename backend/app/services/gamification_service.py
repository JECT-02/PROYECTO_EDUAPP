from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models import User, StudentActivity, ExamSession, StudyTime
from datetime import datetime, timedelta

async def recalculate_sync_score(student_id: str, db: AsyncSession):
    # Retrieve total completed nodes / total nodes across enrolled courses
    # For now, a simplified approximation.
    # In a fully fleshed out scenario, we'd count total nodes for enrolled courses.
    result = await db.execute(
        select(func.count(StudentActivity.id))
        .filter(StudentActivity.student_id == student_id, StudentActivity.status == "completed")
    )
    completed_nodes = result.scalar() or 0
    # Let's say a course has an average of 10 nodes and the user has 1 course. 
    # This is a placeholder since the total node count requires a join.
    total_expected_nodes = max(completed_nodes, 10) 
    nc = min(completed_nodes / total_expected_nodes, 1.0)
    
    # Average score in tests
    result = await db.execute(
        select(func.avg(StudentActivity.score))
        .filter(StudentActivity.student_id == student_id, StudentActivity.score.isnot(None))
    )
    avg_score = result.scalar() or 0.0
    p = min(avg_score, 1.0)
    
    # AI interactions normalized to 50
    result = await db.execute(
        select(func.sum(StudentActivity.help_requests_count))
        .filter(StudentActivity.student_id == student_id)
    )
    help_requests = result.scalar() or 0
    ii = min(help_requests / 50.0, 1.0)
    
    # Active study time in last 7 days normalized to 300 minutes
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    result = await db.execute(
        select(func.sum(StudyTime.active_minutes))
        .filter(StudyTime.student_id == student_id, StudyTime.study_date >= seven_days_ago)
    )
    study_minutes = result.scalar() or 0
    te = min(study_minutes / 300.0, 1.0)
    
    # Formula: S = (Nc * 0.40) + (P * 0.30) + (Ii * 0.20) + (Te * 0.10)
    sync_score = (nc * 0.40) + (p * 0.30) + (ii * 0.20) + (te * 0.10)
    
    # Update user
    user_result = await db.execute(select(User).filter(User.id == student_id))
    user = user_result.scalars().first()
    if user:
        user.sync_score = round(sync_score, 2)
        await db.commit()
    
    return round(sync_score, 2)

async def award_xp(student_id: str, amount: int, db: AsyncSession):
    user_result = await db.execute(select(User).filter(User.id == student_id))
    user = user_result.scalars().first()
    if user:
        user.xp += amount
        
        # Update pet data
        if user.pet_data:
            pet = user.pet_data
            pet["xp_current"] += amount
            
            # Level progression
            if pet["level"] == 1 and pet["xp_current"] >= 501:
                pet["level"] = 2
                pet["xp_next"] = 1501
            elif pet["level"] == 2 and pet["xp_current"] >= 1501:
                pet["level"] = 3
                pet["xp_next"] = 999999
            
            # Re-assign to trigger SQLAlchemy JSON mutation
            # Sometimes modifying JSON in-place isn't detected by SQLAlchemy
            import copy
            user.pet_data = copy.deepcopy(pet)
            
        await db.commit()
