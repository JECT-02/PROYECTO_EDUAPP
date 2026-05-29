from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, Course, CourseMaterial
from app.dependencies import get_current_user
from app.services.file_processor import process_material
from app.utils.exceptions import NotFoundException, BadRequestException
from app.schemas import FileUploadResponse
import os
import uuid
from typing import List

router = APIRouter(prefix="/api/materials", tags=["materials"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploaded_files")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".md", ".csv", ".xls", ".xlsx"}

@router.post("/upload/{course_id}", response_model=List[FileUploadResponse])
async def upload_materials(
    course_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify course exists and user is teacher or enrolled
    course_res = await db.execute(select(Course).filter(Course.id == course_id))
    course = course_res.scalars().first()
    if not course:
        raise NotFoundException(code="COURSE_NOT_FOUND", detail="Course not found")

    if current_user.role != "teacher" or course.teacher_id != current_user.id:
        raise BadRequestException(code="FORBIDDEN", detail="Only the course teacher can upload materials")

    responses = []
    course_upload_dir = os.path.join(UPLOAD_DIR, course_id)
    os.makedirs(course_upload_dir, exist_ok=True)

    for file in files:
        ext = os.path.splitext(file.filename or "file")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        file_id = str(uuid.uuid4())
        safe_name = f"{file_id}{ext}"
        file_path = os.path.join(course_upload_dir, safe_name)

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        material = CourseMaterial(
            id=file_id,
            course_id=course_id,
            filename=safe_name,
            original_name=file.filename or "unknown",
            file_type=file.content_type or "application/octet-stream",
            size_bytes=len(content),
            processing_status="uploaded"
        )
        db.add(material)
        responses.append(FileUploadResponse(
            file_id=file_id,
            filename=file.filename or "unknown",
            size=len(content),
            status="uploaded"
        ))

    await db.commit()

    # Process files: extract text and create embeddings in background
    for i, file in enumerate(files):
        ext = os.path.splitext(file.filename or "file")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        file_id = responses[i].file_id
        content = await file.read()
        try:
            await process_material(file_id, content, file.content_type or "application/octet-stream", course_id, db)
            # Update status to ready
            mat_res = await db.execute(select(CourseMaterial).filter(CourseMaterial.id == file_id))
            mat = mat_res.scalars().first()
            if mat:
                mat.processing_status = "ready"
            await db.commit()
        except Exception as e:
            print(f"Error processing material {file_id}: {e}")
            mat_res = await db.execute(select(CourseMaterial).filter(CourseMaterial.id == file_id))
            mat = mat_res.scalars().first()
            if mat:
                mat.processing_status = "error"
                mat.error_message = str(e)
            await db.commit()

    return responses


@router.get("/{course_id}")
async def list_materials(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CourseMaterial).filter(CourseMaterial.course_id == course_id).order_by(CourseMaterial.created_at.desc())
    )
    materials = result.scalars().all()
    return [
        {
            "id": m.id,
            "filename": m.original_name,
            "file_type": m.file_type,
            "size": m.size_bytes,
            "status": m.processing_status,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in materials
    ]


@router.delete("/{course_id}/{file_id}")
async def delete_material(
    course_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CourseMaterial).filter(CourseMaterial.id == file_id, CourseMaterial.course_id == course_id))
    material = result.scalars().first()
    if not material:
        raise NotFoundException(code="FILE_NOT_FOUND", detail="File not found")

    file_path = os.path.join(UPLOAD_DIR, course_id, material.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(material)
    await db.commit()
    return {"message": "File deleted"}
