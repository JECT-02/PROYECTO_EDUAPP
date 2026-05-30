from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import User
from app.schemas import RegisterRequest, LoginRequest, VerifyOTPRequest, TokenResponse, ForgotPasswordRequest, BaseSchema
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.utils.validators import validate_password_strength
from app.utils.exceptions import BadRequestException, ConflictException, UnauthorizedException
import random
import string

router = APIRouter(prefix="/api/auth", tags=["auth"])

def generate_otp():
    return "".join(random.choices(string.digits, k=6))

# Dev mode: always accept any 6-digit OTP code
DEV_MODE_ACCEPT_ANY_OTP = True

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not validate_password_strength(request.password):
        raise BadRequestException(code="WEAK_PASSWORD", detail="Password does not meet complexity requirements")
    
    result = await db.execute(select(User).filter(User.email == request.email))
    if result.scalars().first():
        raise ConflictException(code="EMAIL_EXISTS", detail="Email already registered")
        
    otp = generate_otp()
    print(f"--- DEVELOPMENT OTP FOR {request.email}: {otp} ---") # Simulated email
    
    account_state = "active"
    if request.role == "student" and request.age_group in ["7-10", "11-14"]:
        if not request.parent_email:
            raise BadRequestException(code="PARENT_EMAIL_REQUIRED", detail="Se requiere el correo del padre/tutor para menores de 14 años")
        account_state = "pending_parent"
        
    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        name=request.name,
        role=request.role,
        age_group=request.age_group,
        dni=request.dni,
        institution=request.institution,
        main_subject=request.main_subject,
        relationship=request.relationship,
        account_state=account_state,
        verification_code=otp,
        verification_code_expires=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    
    db.add(new_user)
    await db.commit()
    
    return {"message": "Verification code sent", "email": request.email}

@router.post("/verify", response_model=TokenResponse)
async def verify_otp(request: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalars().first()
    
    if not user:
        raise UnauthorizedException(code="USER_NOT_FOUND", detail="User not found")
        
    # Dev mode: accept any 6-digit code
    if not DEV_MODE_ACCEPT_ANY_OTP:
        if not user.verification_code or user.verification_code != request.code:
            raise UnauthorizedException(code="INVALID_CODE", detail="Invalid verification code")
        # Expiry is tricky with naive/aware datetime in sqlite, doing simple check
        if user.verification_code_expires and user.verification_code_expires < datetime.now(timezone.utc).replace(tzinfo=None):
            raise UnauthorizedException(code="EXPIRED_CODE", detail="Verification code expired")
        
    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    await db.commit()
    
    access_token = create_access_token(subject=user.id, email=user.email, role=user.role, dni=user.dni)
    refresh_token = create_refresh_token(subject=user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={"id": user.id, "email": user.email, "name": user.name, "role": user.role, "accountState": user.account_state}
    )

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalars().first()
    
    if not user:
        raise UnauthorizedException(code="USER_NOT_FOUND", detail="El correo no está registrado. Verifica tus credenciales o crea una cuenta nueva.")
        
    if not verify_password(request.password, user.hashed_password):
        raise UnauthorizedException(code="WRONG_PASSWORD", detail="Contraseña incorrecta. Verifica tus credenciales.")
        
    if not user.email_verified:
        raise UnauthorizedException(code="UNVERIFIED_EMAIL", detail="Email not verified")
        
    if user.account_state == "pending_parent":
        raise UnauthorizedException(code="PENDING_PARENT", detail="Account pending parent approval")
        
    access_token = create_access_token(subject=user.id, email=user.email, role=user.role, dni=user.dni)
    refresh_token = create_refresh_token(subject=user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={"id": user.id, "email": user.email, "name": user.name, "role": user.role, "accountState": user.account_state}
    )

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Always return success to prevent email enumeration
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalars().first()
    
    if user:
        # Simulate magic link sending
        print(f"--- DEVELOPMENT MAGIC LINK FOR {request.email}: http://localhost:5173/reset?token=simulated_token ---")
        
    return {"message": "Si el correo está registrado, se ha enviado un enlace de recuperación."}
