from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, ReinforcementRequest as RRModel, UserBadge, Badge
from app.schemas import ReinforcementRequestParams, ReinforcementResponse
from app.dependencies import require_role
from app.services.ai_engine import generate_reinforcement

router = APIRouter(prefix="/api", tags=["reinforcement_achievements"])

@router.post("/reinforcement/request", response_model=ReinforcementResponse)
async def request_reinforcement(
    request: ReinforcementRequestParams,
    current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    # Create DB record
    req = RRModel(student_id=current_user.id, concept_name=request.concept_name, analogy_style=request.style)
    db.add(req)
    await db.commit()
    
    # Generate content
    ai_res = await generate_reinforcement(request.concept_name, request.style)
    return ReinforcementResponse(**ai_res)

@router.get("/achievements")
async def get_achievements(
    current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    # Fetch user badges with joined badge info
    # For now return an empty list or mock since we didn't populate badges table
    return {
        "badges": [],
        "stats": {
            "total_xp": current_user.xp,
            "level": current_user.pet_data.get("level", 1) if current_user.pet_data else 1
        }
    }
