from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # student, teacher, parent, admin
    dni = Column(String(50), nullable=True)
    
    # Generic states
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    account_state = Column(String(50), default="active") # active, pending_parent
    
    # Student specific
    age_group = Column(String(50), nullable=True)
    xp = Column(Integer, default=0)
    sync_score = Column(Float, default=0.0)
    avatar_url = Column(String(255), nullable=True)
    accessibility_config = Column(JSON, nullable=True) # 6 boolean flags
    pet_data = Column(JSON, nullable=True)
    
    # Teacher specific
    institution = Column(String(255), nullable=True)
    main_subject = Column(String(255), nullable=True)
    
    # Parent specific
    relationship = Column(String(50), nullable=True)
    
    # Verification
    verification_code = Column(String(6), nullable=True)
    verification_code_expires = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    parent_id = Column(String(36), ForeignKey("users.id"))
    student_id = Column(String(36), ForeignKey("users.id"))
    status = Column(String(50), default="pending") # pending, accepted, rejected
    invitation_code = Column(String(6), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Course(Base):
    __tablename__ = "courses"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    teacher_id = Column(String(36), ForeignKey("users.id"))
    title = Column(String(100), nullable=False)
    description = Column(String(500), nullable=False)
    category = Column(String(50), nullable=False)
    age_level = Column(String(50), nullable=False)
    cover_image = Column(String(255), nullable=True)
    status = Column(String(50), default="draft") # draft, published, archived
    pedagogical_rigor = Column(Integer, default=3) # 1-5
    
    # cached graph 
    cached_graph = Column(JSON, nullable=True)
    
    includes_final_exam = Column(Boolean, default=True)
    enable_multisource_reinforcement = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    published_at = Column(DateTime, nullable=True)

class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    course_id = Column(String(36), ForeignKey("courses.id"))
    enrolled_at = Column(DateTime, default=func.now())

class Node(Base):
    __tablename__ = "nodes"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id"))
    node_type = Column(String(50), nullable=False) # theory, practice, quiz, boss, reward
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False)
    prerequisites = Column(JSON, default=[]) # list of node ids
    metadata_json = Column(JSON, nullable=True)
    
    # AI generated content
    ai_content = Column(JSON, nullable=True) 
    teacher_review_status = Column(String(50), default="pending") # pending, approved, rejected, edited
    teacher_feedback = Column(Text, nullable=True)
    
    quiz_config = Column(JSON, nullable=True)
    has_student_activity = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class CourseMaterial(Base):
    __tablename__ = "course_materials"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id"))
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    size_bytes = Column(Integer, default=0)
    extracted_text = Column(Text, nullable=True)
    source_url = Column(String(500), nullable=True)
    processing_status = Column(String(50), default="pending") # pending, extracting, chunking, embedding, ready, error
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class MaterialEmbedding(Base):
    __tablename__ = "material_embeddings"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id"))
    material_id = Column(String(36), ForeignKey("course_materials.id"))
    chunk_text = Column(Text, nullable=False)
    embedding_vector = Column(Text, nullable=False) # Stored as JSON string list of floats
    chunk_index = Column(Integer, nullable=False)

class StudentActivity(Base):
    __tablename__ = "student_activities"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    course_id = Column(String(36), ForeignKey("courses.id"))
    node_id = Column(String(36), ForeignKey("nodes.id"))
    
    status = Column(String(50), default="locked") # locked, available, in_progress, completed
    score = Column(Float, nullable=True)
    help_requests_count = Column(Integer, default=0)
    attempts_count = Column(Integer, default=0)
    
    reading_percentage = Column(Float, default=0.0)
    reading_time_seconds = Column(Integer, default=0)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, default=func.now())

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    node_id = Column(String(36), ForeignKey("nodes.id"))
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False) # multiple_choice, true_false, matching
    options = Column(JSON, nullable=False)
    correct_answer = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(Float, default=0.5)
    concept_tag = Column(String(255), nullable=True)
    created_by_ai = Column(Boolean, default=True)

class QuizAnswer(Base):
    __tablename__ = "quiz_answers"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    question_id = Column(String(36), ForeignKey("quiz_questions.id"))
    given_answer = Column(String(255), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    time_taken_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())

class ExamSession(Base):
    __tablename__ = "exam_sessions"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    course_id = Column(String(36), ForeignKey("courses.id"))
    node_id = Column(String(36), ForeignKey("nodes.id"), nullable=True)
    exam_type = Column(String(50), nullable=False) # unit_test, coliseo
    
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, nullable=True)
    total_time_seconds = Column(Integer, default=0)
    
    final_score = Column(Float, nullable=True)
    passed = Column(Boolean, nullable=True)
    suspicious_activity = Column(Boolean, default=False)
    status = Column(String(50), default="in_progress") # in_progress, submitted, abandoned
    lives_remaining = Column(Integer, nullable=True)

class StudentWeakness(Base):
    __tablename__ = "student_weaknesses"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    course_id = Column(String(36), ForeignKey("courses.id"))
    concept_name = Column(String(255), nullable=False)
    error_count = Column(Integer, default=0)
    mastery_level = Column(Float, default=0.0)
    last_error_at = Column(DateTime, nullable=True)

class StudyTime(Base):
    __tablename__ = "study_times"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    course_id = Column(String(36), ForeignKey("courses.id"))
    study_date = Column(String(10), nullable=False) # YYYY-MM-DD
    active_minutes = Column(Integer, default=0)
    nodes_completed = Column(Integer, default=0)

class Badge(Base):
    __tablename__ = "badges"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    icon_id = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False) # mastery, behavioral, secret
    rarity = Column(String(50), nullable=False) # common, rare, epic, legendary
    condition_type = Column(String(100), nullable=False)
    condition_value = Column(Float, nullable=False)
    parameters = Column(JSON, nullable=True)

class UserBadge(Base):
    __tablename__ = "user_badges"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    badge_id = Column(String(36), ForeignKey("badges.id"))
    earned_at = Column(DateTime, default=func.now())
    metadata_json = Column(JSON, nullable=True)

class CourseInvitation(Base):
    __tablename__ = "course_invitations"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id"))
    token = Column(String(100), unique=True, nullable=False)
    short_code = Column(String(6), unique=True, nullable=False)
    qr_url = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    uses_count = Column(Integer, default=0)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())

class ReinforcementRequest(Base):
    __tablename__ = "reinforcement_requests"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    node_id = Column(String(36), ForeignKey("nodes.id"))
    concept_name = Column(String(255), nullable=False)
    confusion_level = Column(Integer, default=1)
    analogy_style = Column(String(50), nullable=True)
    ai_response = Column(Text, nullable=True)
    external_resources = Column(JSON, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class AIContentReview(Base):
    __tablename__ = "ai_content_reviews"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id"))
    node_id = Column(String(36), ForeignKey("nodes.id"))
    original_chunk = Column(Text, nullable=False)
    generated_content = Column(Text, nullable=False)
    teacher_feedback = Column(Text, nullable=True)
    status = Column(String(50), default="pending") # pending, approved, rejected, edited
    reviewed_at = Column(DateTime, nullable=True)

class ColosseoAttempt(Base):
    __tablename__ = "colosseo_attempts"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id"))
    course_id = Column(String(36), ForeignKey("courses.id"))
    attempt_number = Column(Integer, default=1)
    score = Column(Float, nullable=True)
    lives_remaining = Column(Integer, nullable=True)
    passed = Column(Boolean, nullable=True)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
