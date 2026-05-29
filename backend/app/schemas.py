from pydantic import BaseModel, EmailStr, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import List, Optional, Dict, Any
from datetime import datetime

class BaseSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

# Auth Schemas
class RegisterRequest(BaseSchema):
    email: EmailStr
    password: str
    name: str
    role: str
    # Student
    age_group: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    # Teacher
    institution: Optional[str] = None
    main_subject: Optional[str] = None
    # Parent
    relationship: Optional[str] = None

class LoginRequest(BaseSchema):
    email: EmailStr
    password: str
    role: Optional[str] = None

class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class VerifyOTPRequest(BaseSchema):
    email: EmailStr
    code: str

class RefreshTokenRequest(BaseSchema):
    refresh_token: str

class ForgotPasswordRequest(BaseSchema):
    email: EmailStr

# Onboarding Schemas
class StudentOnboardingRequest(BaseSchema):
    accessibility_config: Dict[str, bool]
    avatar_url: str
    pet_base: str
    pet_name: Optional[str] = None

class TeacherOnboardingRequest(BaseSchema):
    institution: str
    main_subject: str

class ParentOnboardingRequest(BaseSchema):
    relationship: str

# Course Schemas
class CourseCreateRequest(BaseSchema):
    title: str
    description: str
    category: str
    age_level: str
    cover_image: Optional[str] = None
    pedagogical_rigor: int = 3

class CourseResponse(BaseSchema):
    id: str
    title: str
    description: str
    category: str
    status: str
    teacher_name: Optional[str] = None
    cover_image: Optional[str] = None
    progress: Optional[float] = None
    last_activity: Optional[datetime] = None

class NodeSchema(BaseSchema):
    id: str
    type: str
    title: str
    order_index: int
    prerequisites: List[str]
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[str] = None # locked, available, in_progress, completed

class RoadmapResponse(BaseSchema):
    course_id: str
    title: str
    nodes: List[NodeSchema]
    sync_score: Optional[float] = None

class EnrollRequest(BaseSchema):
    code: Optional[str] = None
    course_id: Optional[str] = None

# Material Schema
class MaterialUploadResponse(BaseSchema):
    material_id: str
    filename: str
    status: str

# Content Review
class ContentReviewActionRequest(BaseSchema):
    action: str # approve, reject, edit
    content: Optional[str] = None
    feedback: Optional[str] = None

# Lesson schemas
class LessonResponse(BaseSchema):
    content_html: str
    key_concepts: List[str]
    reading_percentage: float

class ReadingProgressRequest(BaseSchema):
    reading_percentage: float
    time_seconds: int

# AI Chat Schemas
class ChatRequest(BaseSchema):
    concept: str
    question: str
    difficulty_level: str = "intermedio"  # basico, intermedio, avanzado
    conversation_history: Optional[List[Dict[str, str]]] = None

class ChatResponse(BaseSchema):
    response: str
    new_difficulty_level: Optional[str] = None
    suggested_simplification: Optional[bool] = False

class SimplifyContentRequest(BaseSchema):
    content_html: str
    concept: str
    current_difficulty: str = "intermedio"
    target_difficulty: str = "basico"

# Quiz Schemas
class QuizQuestionResponse(BaseSchema):
    id: str
    text: str
    type: str
    options: Dict[str, str]

class QuizSubmitRequest(BaseSchema):
    answers: Dict[str, str] # question_id -> given_answer
    time_taken: int

class QuizSubmitResponse(BaseSchema):
    score: float
    passed: bool
    correct_answers: Dict[str, str]
    explanations: Dict[str, str]
    xp_earned: int
    new_sync_score: float

# Reinforcement Schema
class ReinforcementRequestParams(BaseSchema):
    concept_name: str
    style: str

class ReinforcementResponse(BaseSchema):
    analogy: str
    external_resources: List[Dict[str, str]]
    guided_practice: Dict[str, Any]

# Gamification Schema
class PetState(BaseSchema):
    base: str
    name: str
    level: int
    xp_current: int
    xp_next: int
    emotion: str
    accessories: List[str]

class DashboardResponse(BaseSchema):
    greeting: str
    continue_card: Optional[Dict[str, Any]]
    courses: List[CourseResponse]
    daily_challenges: List[Dict[str, Any]]
    pet: PetState
    sync_score: float
    streak_days: int

# Parent schemas
class LinkStudentRequest(BaseSchema):
    code: str

# Accessibility schemas
class VoiceCommandRequest(BaseSchema):
    command: str
    context: Dict[str, Any]

class VoiceCommandResponse(BaseSchema):
    action: str
    params: Dict[str, Any]
    tts_feedback: str

# AI Generation schemas
class FileUploadResponse(BaseSchema):
    file_id: str
    filename: str
    size: int
    status: str

class AIGenerateRequest(BaseSchema):
    course_name: str
    course_subject: str
    course_desc: str
    age_level: str = "15-17"
    file_ids: List[str] = []
    generate_topics: bool = True
    generate_content: bool = True
    generate_roadmap: bool = True
    generate_quizzes: bool = True
    generate_exercises: bool = False

class AIGenerateResponse(BaseSchema):
    course_id: str
    course_title: str
    nodes_created: int
    message: str

class UpdateNodeContentRequest(BaseSchema):
    content_html: str
    key_concepts: List[str] = []

class UpdateNodeContentResponse(BaseSchema):
    success: bool
    message: str
