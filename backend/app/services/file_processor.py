import fitz  # PyMuPDF
import docx
import io
from app.services.rag_service import get_embedding
from app.models import CourseMaterial, MaterialEmbedding
from sqlalchemy.ext.asyncio import AsyncSession
import json

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    try:
        doc = fitz.open("pdf", file_bytes)
        for page in doc:
            text += page.get_text() + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(file_bytes: bytes) -> str:
    text = ""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error reading DOCX: {e}")
    return text

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    # Very basic character-level chunking
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
    return chunks

async def process_material(material_id: str, file_bytes: bytes, file_type: str, course_id: str, db: AsyncSession):
    # 1. Extract text
    if file_type == "application/pdf":
        text = extract_text_from_pdf(file_bytes)
    elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        text = extract_text_from_docx(file_bytes)
    else:
        # Assuming text/plain
        text = file_bytes.decode('utf-8', errors='ignore')
        
    # 2. Chunk text
    chunks = chunk_text(text)
    
    # 3. Create embeddings and save
    for i, chunk in enumerate(chunks):
        if not chunk.strip(): continue
        vec = await get_embedding(chunk)
        emb = MaterialEmbedding(
            course_id=course_id,
            material_id=material_id,
            chunk_text=chunk,
            embedding_vector=json.dumps(vec),
            chunk_index=i
        )
        db.add(emb)
        
    await db.commit()
