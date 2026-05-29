from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, Course, Enrollment, CourseInvitation, Node, StudentActivity, CourseMaterial
from app.schemas import EnrollRequest, CourseResponse, RoadmapResponse, NodeSchema, AIGenerateRequest, AIGenerateResponse
from app.dependencies import get_current_user, require_role
from app.utils.exceptions import NotFoundException, ConflictException, BadRequestException, ForbiddenException
from app.services.ai_engine import generate_course_from_files
from typing import List
import uuid
import json

router = APIRouter(prefix="/api/courses", tags=["courses"])

@router.get("/explore", response_model=List[CourseResponse])
async def explore_courses(
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    # Find all published courses where user is not enrolled
    enrollments_res = await db.execute(select(Enrollment).filter(Enrollment.student_id == current_user.id))
    enrolled_ids = [e.course_id for e in enrollments_res.scalars().all()]
    
    query = select(Course).filter(Course.status == "published")
    if enrolled_ids:
        query = query.filter(Course.id.notin_(enrolled_ids))
        
    courses_res = await db.execute(query)
    courses = courses_res.scalars().all()
    
    responses = []
    for c in courses:
        teacher_res = await db.execute(select(User).filter(User.id == c.teacher_id))
        teacher = teacher_res.scalars().first()
        
        responses.append(CourseResponse(
            id=c.id,
            title=c.title,
            description=c.description,
            category=c.category,
            status=c.status,
            teacherName=teacher.name if teacher else "Docente",
            coverImage=c.cover_image,
            progress=0.0
        ))
    return responses

@router.post("/enroll")
async def enroll_course(
    request: EnrollRequest,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    course_id = request.course_id
    if request.code:
        inv_res = await db.execute(select(CourseInvitation).filter(CourseInvitation.short_code == request.code))
        inv = inv_res.scalars().first()
        if not inv:
            raise NotFoundException(code="INVALID_CODE", detail="Invalid invitation code")
        # In a full implementation, check expiry and max uses here
        course_id = inv.course_id
        
    if not course_id:
        raise BadRequestException(code="MISSING_PARAM", detail="Must provide course_id or code")
        
    # Verify course exists
    course_res = await db.execute(select(Course).filter(Course.id == course_id))
    course = course_res.scalars().first()
    if not course or course.status != "published":
        raise NotFoundException(code="COURSE_NOT_FOUND", detail="Course not found or not published")
        
    # Verify not enrolled
    enr_res = await db.execute(
        select(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.course_id == course_id)
    )
    if enr_res.scalars().first():
        raise ConflictException(code="ALREADY_ENROLLED", detail="Already enrolled in this course")
        
    # Enroll
    enrollment = Enrollment(student_id=current_user.id, course_id=course_id)
    db.add(enrollment)
    
    # Generate initial activities for nodes
    nodes_res = await db.execute(select(Node).filter(Node.course_id == course_id).order_by(Node.order_index))
    nodes = nodes_res.scalars().all()
    
    for i, node in enumerate(nodes):
        status = "available" if i == 0 else "locked"
        act = StudentActivity(
            student_id=current_user.id,
            course_id=course_id,
            node_id=node.id,
            status=status
        )
        db.add(act)
        
    await db.commit()
    return {"message": "Enrolled successfully", "courseId": course_id}

@router.get("/{course_id}/roadmap", response_model=RoadmapResponse)
async def get_roadmap(
    course_id: str,
    current_user: User = Depends(get_current_user), # Any role can view, but details vary
    db: AsyncSession = Depends(get_db)
):
    # Verify course
    course_res = await db.execute(select(Course).filter(Course.id == course_id))
    course = course_res.scalars().first()
    if not course:
        raise NotFoundException(code="COURSE_NOT_FOUND", detail="Course not found")
        
    # If student, verify enrollment
    if current_user.role == "student":
        enr_res = await db.execute(
            select(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.course_id == course_id)
        )
        if not enr_res.scalars().first():
            raise ForbiddenException(code="NOT_ENROLLED", detail="Not enrolled in course")
            
    # Get nodes
    nodes_res = await db.execute(select(Node).filter(Node.course_id == course_id).order_by(Node.order_index))
    nodes = nodes_res.scalars().all()
    
    # If using cached graph and no nodes in DB (e.g. mock), fallback to cached
    if not nodes and course.cached_graph:
        node_schemas = []
        for n in course.cached_graph:
            node_schemas.append(NodeSchema(
                id=n["id"],
                type=n["type"],
                title=n["title"],
                order_index=n.get("order", 0),
                prerequisites=n.get("prerequisites", []),
                metadata=n.get("metadata", {}),
                status=n.get("status", "locked")
            ))
        return RoadmapResponse(
            course_id=course.id,
            title=course.title,
            nodes=node_schemas,
            sync_score=current_user.sync_score if current_user.role == "student" else None
        )
        
    node_schemas = []
    # Fetch activities if student
    activities_dict = {}
    if current_user.role == "student":
        act_res = await db.execute(
            select(StudentActivity).filter(
                StudentActivity.student_id == current_user.id, 
                StudentActivity.course_id == course_id
            )
        )
        for act in act_res.scalars().all():
            activities_dict[act.node_id] = act
            
    for node in nodes:
        status = "available" # default for teacher/parent
        if current_user.role == "student":
            act = activities_dict.get(node.id)
            status = act.status if act else "locked"
            
        node_schemas.append(NodeSchema(
            id=node.id,
            type=node.node_type,
            title=node.title,
            order_index=node.order_index,
            prerequisites=node.prerequisites,
            metadata=node.metadata_json,
            status=status
        ))
        
    return RoadmapResponse(
        course_id=course.id,
        title=course.title,
        nodes=node_schemas,
        sync_score=current_user.sync_score if current_user.role == "student" else None
    )


@router.post("/ai-generate", response_model=AIGenerateResponse)
async def ai_generate_course(
    request: AIGenerateRequest,
    current_user: User = Depends(require_role(["teacher"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a complete course with roadmap from uploaded files using Gemini AI.
    """
    # Get uploaded file contents
    file_contents = []
    for fid in request.file_ids:
        mat_res = await db.execute(select(CourseMaterial).filter(CourseMaterial.id == fid))
        mat = mat_res.scalars().first()
        if mat and mat.extracted_text:
            file_contents.append(f"--- {mat.original_name} ---\n{mat.extracted_text[:3000]}")
        elif mat:
            file_contents.append(f"--- {mat.original_name} --- (sin contenido extraido)")

    files_context = "\n\n".join(file_contents) if file_contents else "No se subieron archivos"

    # Generate course structure using Gemini
    result = await generate_course_from_files(
        course_name=request.course_name,
        course_subject=request.course_subject,
        course_desc=request.course_desc,
        age_level=request.age_level,
        files_context=files_context,
        generate_topics=request.generate_topics,
        generate_content=request.generate_content,
        generate_roadmap=request.generate_roadmap,
    )

    if not result:
        # Fallback: create basic structure
        course_id = str(uuid.uuid4())
        course = Course(
            id=course_id,
            teacher_id=current_user.id,
            title=request.course_name,
            description=request.course_desc,
            category=request.course_subject or "General",
            age_level=request.age_level,
        )
        db.add(course)

        # Create default theory node
        node_id = str(uuid.uuid4())
        node = Node(
            id=node_id,
            course_id=course_id,
            node_type="theory",
            title=request.course_name,
            description=request.course_desc,
            order_index=0,
            prerequisites=[],
        )
        db.add(node)
        await db.commit()

        return AIGenerateResponse(
            course_id=course_id,
            course_title=request.course_name,
            nodes_created=1,
            message=f"Curso '{request.course_name}' creado (modo basico)"
        )

    # Create course from AI result
    course_id = str(uuid.uuid4())
    course = Course(
        id=course_id,
        teacher_id=current_user.id,
        title=request.course_name,
        description=request.course_desc,
        category=request.course_subject or "General",
        age_level=request.age_level,
        status="draft",
        cached_graph=result.get("nodes", []),
    )
    db.add(course)

    nodes = result.get("nodes", [])
    node_count = 0
    for i, node_data in enumerate(nodes):
        node_id = str(uuid.uuid4())
        node = Node(
            id=node_id,
            course_id=course_id,
            node_type=node_data.get("type", "theory"),
            title=node_data.get("title", f"Leccion {i+1}"),
            description=node_data.get("description", ""),
            order_index=i,
            prerequisites=node_data.get("prerequisites", []),
            metadata_json=node_data.get("metadata", {}),
            ai_content=node_data.get("content", None),
            teacher_review_status="pending",
        )
        db.add(node)
        node_count += 1

    await db.commit()

    return AIGenerateResponse(
        course_id=course_id,
        course_title=request.course_name,
        nodes_created=node_count,
        message=f"Curso '{request.course_name}' creado con {node_count} nodos usando Gemini AI"
    )
