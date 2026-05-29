from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.schemas import StudentOnboardingRequest, TeacherOnboardingRequest, ParentOnboardingRequest
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

@router.post("/student")
async def onboarding_student(
    request: StudentOnboardingRequest,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    current_user.accessibility_config = request.accessibility_config
    current_user.avatar_url = request.avatar_url
    current_user.pet_data = {
        "base": request.pet_base,
        "name": request.pet_name or ("Duo" if request.pet_base == "owl" else request.pet_base),
        "level": 1,
        "xp_current": 0,
        "xp_next": 500,
        "emotion": "normal",
        "accessories": []
    }
    await db.commit()
    return {"message": "Onboarding complete"}

@router.post("/teacher")
async def onboarding_teacher(
    request: TeacherOnboardingRequest,
    current_user: User = Depends(require_role(["teacher"])),
    db: AsyncSession = Depends(get_db)
):
    current_user.institution = request.institution
    current_user.main_subject = request.main_subject
    await db.commit()
    return {"message": "Onboarding complete"}

@router.post("/parent")
async def onboarding_parent(
    request: ParentOnboardingRequest,
    current_user: User = Depends(require_role(["parent"])),
    db: AsyncSession = Depends(get_db)
):
    current_user.relationship = request.relationship
    await db.commit()
    return {"message": "Onboarding complete"}
