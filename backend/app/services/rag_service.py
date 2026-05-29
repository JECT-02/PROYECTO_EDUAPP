from openai import AsyncOpenAI
from app.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import MaterialEmbedding
import json
import math

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

def cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0
    return dot_product / (norm_v1 * norm_v2)

async def get_embedding(text: str) -> list[float]:
    if not client:
        return [0.0] * 1536
    response = await client.embeddings.create(
        input=text,
        model=settings.OPENAI_MODEL_EMB
    )
    return response.data[0].embedding

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
