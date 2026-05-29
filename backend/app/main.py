from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import get_settings
from app.routers import auth, onboarding, dashboard, courses, lessons, quizzes, exams, reinforcement, teacher, parent, accessibility
from app.database import engine, Base

settings = get_settings()

# Initialize FastAPI
app = FastAPI(
    title="EduApp Backend API",
    description="Backend para la plataforma educativa EduApp",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "x-refresh-token", "x-timezone"],
)

# Exception handlers
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(dashboard.router)
app.include_router(courses.router)
app.include_router(lessons.router)
app.include_router(quizzes.router)
app.include_router(exams.router)
app.include_router(reinforcement.router)
app.include_router(teacher.router)
app.include_router(parent.router)
app.include_router(accessibility.router)

# Database initialization
@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"message": "EduApp Backend API is running"}
