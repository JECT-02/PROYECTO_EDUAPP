from google import genai
from app.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import MaterialEmbedding
import json
import math
import asyncio

settings = get_settings()
genai_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

def cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0
    return dot_product / (norm_v1 * norm_v2)

async def get_embedding(text: str) -> list[float]:
    if not genai_client:
        return [0.0] * 768
    
    def _sync_embed():
        result = genai_client.models.embed_content(
            model=settings.GEMINI_MODEL_EMB,
            contents=text,
        )
        return result.embeddings[0].values
    
    return await asyncio.to_thread(_sync_embed)

async def retrieve_context(course_id: str, query: str, db: AsyncSession, top_k: int = 3) -> str:
    # 1. Embed query
    query_vec = await get_embedding(query)
    
    # 2. Fetch all embeddings for course
    result = await db.execute(select(MaterialEmbedding).filter(MaterialEmbedding.course_id == course_id))
    embeddings = result.scalars().all()
    
    if not embeddings:
        return ""
        
    # 3. Calculate similarities
    scored = []
    for emb in embeddings:
        vec = json.loads(emb.embedding_vector)
        score = cosine_similarity(query_vec, vec)
        scored.append((score, emb.chunk_text))
        
    # 4. Sort and take top_k
    scored.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [x[1] for x in scored[:top_k]]
    
    return "\n\n---\n\n".join(top_chunks)
