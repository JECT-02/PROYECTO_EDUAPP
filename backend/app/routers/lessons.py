from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, Node, StudentActivity, Enrollment
from app.schemas import LessonResponse, ReadingProgressRequest, ChatRequest, ChatResponse, SimplifyContentRequest
from app.dependencies import require_role
from app.services.ai_engine import generate_lesson_content, generate_chat_response
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


@router.post("/{course_id}/nodes/{node_id}/chat", response_model=ChatResponse)
async def chat_with_tutor(
    course_id: str,
    node_id: str,
    request: ChatRequest,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Chat with the AI tutor about a lesson concept.
    The AI adapts its response based on the student's difficulty level.
    """
    # Verify enrollment
    enr_res = await db.execute(select(Enrollment).filter(
        Enrollment.student_id == current_user.id, Enrollment.course_id == course_id))
    if not enr_res.scalars().first():
        raise ForbiddenException(code="NOT_ENROLLED", detail="Not enrolled")

    # Determine difficulty level based on sync_score if not specified
    difficulty = request.difficulty_level
    if not difficulty or difficulty == "auto":
        sync = current_user.sync_score or 0.5
        if sync < 0.4:
            difficulty = "basico"
        elif sync < 0.7:
            difficulty = "intermedio"
        else:
            difficulty = "avanzado"

    # Get the current node context for better AI responses
    node_res = await db.execute(select(Node).filter(Node.id == node_id, Node.course_id == course_id))
    node = node_res.scalars().first()
    concept = request.concept or (node.title if node else "concepto general")

    # Generate AI response
    ai_response = await generate_chat_response(
        concept=concept,
        question=request.question,
        difficulty_level=difficulty,
        conversation_history=request.conversation_history or []
    )

    # Detect if student needs simplification
    needs_simplification = False
    question_lower = request.question.lower()
    if any(word in question_lower for word in ["no entiendo", "más fácil", "simplifica", "no comprendo", "explica otra vez"]):
        needs_simplification = True
        if difficulty == "avanzado":
            difficulty = "intermedio"
        elif difficulty == "intermedio":
            difficulty = "basico"

    return ChatResponse(
        response=ai_response,
        new_difficulty_level=difficulty if needs_simplification else None,
        suggested_simplification=needs_simplification
    )


@router.post("/{course_id}/nodes/{node_id}/simplify", response_model=LessonResponse)
async def simplify_lesson_content(
    course_id: str,
    node_id: str,
    request: SimplifyContentRequest,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Simplify lesson content to a more accessible level.
    """
    # Verify enrollment
    enr_res = await db.execute(select(Enrollment).filter(
        Enrollment.student_id == current_user.id, Enrollment.course_id == course_id))
    if not enr_res.scalars().first():
        raise ForbiddenException(code="NOT_ENROLLED", detail="Not enrolled")

    # Use AI to simplify the content
    from app.services.ai_engine import _gemini_generate
    
    prompt = f"""
    Eres un tutor experto en simplificar contenido educativo.
    
    Contenido original sobre "{request.concept}":
    {request.content_html}
    
    El estudiante tiene dificultad para entender este contenido.
    
    Nivel actual: {request.current_difficulty}
    Nivel objetivo: {request.target_difficulty}
    
    Instrucciones según nivel:
    - "basico": Usa palabras muy simples, frases cortas, analogías cotidianas. Explica como a un niño.
    - "intermedio": Lenguaje claro con algunos términos técnicos explicados.
    - "avanzado": Mantén el nivel técnico pero reorganiza para mayor claridad.
    
    Responde ÚNICAMENTE con un JSON válido:
    {{
        "content_html": "HTML del contenido simplificado usando <p>, <ul>, etc.",
        "key_concepts": ["lista", "de", "conceptos", "clave"]
    }}
    """
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "content_html": {"type": "STRING"},
            "key_concepts": {"type": "ARRAY", "items": {"type": "STRING"}}
        },
        "required": ["content_html", "key_concepts"]
    }
    
    response = await _gemini_generate(prompt, schema)
    if response and response.text:
        import json
        data = json.loads(response.text)
        return LessonResponse(
            content_html=data.get("content_html", request.content_html),
            key_concepts=data.get("key_concepts", []),
            reading_percentage=0.0
        )
    
    return LessonResponse(
        content_html=request.content_html,
        key_concepts=[],
        reading_percentage=0.0
    )
