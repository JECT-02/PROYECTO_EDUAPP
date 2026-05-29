from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.database import get_db
from app.models import User
from app.utils.security import decode_token
from app.utils.exceptions import UnauthorizedException, ForbiddenException

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise UnauthorizedException(code="INVALID_TOKEN", detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(code="INVALID_TOKEN", detail="Token missing subject")
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise UnauthorizedException(code="USER_NOT_FOUND", detail="User not found")
        
    if not user.is_active:
        raise UnauthorizedException(code="INACTIVE_USER", detail="User account is inactive")
        
    return user

def require_role(roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenException(code="INSUFFICIENT_PERMISSIONS", detail=f"Requires one of roles: {', '.join(roles)}")
        return current_user
    return role_checker
