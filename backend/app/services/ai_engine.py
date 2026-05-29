from openai import AsyncOpenAI
from app.config import get_settings
import json

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

async def generate_lesson_content(topic: str, context: str, sync_score: float) -> dict:
    if not client:
        return {
            "content_html": f"<p>Contenido simulado para <b>{topic}</b>.</p><p><concept>Concepto clave simulado</concept></p>",
            "key_concepts": ["Concepto clave simulado"]
        }
        
    tone_instruction = "Usa lenguaje claro y educativo."
    if sync_score < 0.4:
        tone_instruction = "Usa analogías muy simples, explicaciones paso a paso y lenguaje básico."
    elif sync_score > 0.8:
        tone_instruction = "Usa lenguaje técnico preciso y académico formal."
        
    prompt = f"""
    Eres un tutor experto en {topic}. Crea una lección teórica corta basada en el siguiente contexto:
    {context}
    
    Instrucciones de tono: {tone_instruction}
    
    Debes envolver los conceptos clave más importantes con la etiqueta HTML personalizada <concept>concepto</concept>.
    
    Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
    {{
        "content_html": "HTML de la lección usando <p>, <ul>, etc.",
        "key_concepts": ["lista", "de", "conceptos"]
    }}
    """
    
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL_GEN,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

async def generate_quiz_questions(topic: str, context: str, weaknesses: list = []) -> list:
    if not client:
        return [
            {
                "id": "q1",
                "text": f"Pregunta simulada sobre {topic}?",
                "type": "multiple_choice",
                "options": {"a": "Opción 1", "b": "Opción 2", "c": "Opción 3", "d": "Opción 4"},
                "correct_answer": "a",
                "explanation": "Explicación simulada",
                "concept_tag": "Simulado"
            }
        ]
        
    weaknesses_str = ", ".join(weaknesses) if weaknesses else "Ninguna debilidad específica."
    
    prompt = f"""
    Crea 3 preguntas tipo test sobre {topic} basadas en:
    {context}
    
    Presta especial atención a estos conceptos débiles: {weaknesses_str}
    
    Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
    {{
        "questions": [
            {{
                "id": "q1",
                "text": "Texto de pregunta",
                "type": "multiple_choice",
                "options": {{"a": "opcion", "b": "opcion", "c": "opcion", "d": "opcion"}},
                "correct_answer": "a",
                "explanation": "Por qué la 'a' es correcta",
                "concept_tag": "Concepto evaluado"
            }}
        ]
    }}
    """
    
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL_GEN,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    data = json.loads(response.choices[0].message.content)
    return data.get("questions", [])

async def generate_reinforcement(concept: str, style: str) -> dict:
    if not client:
        return {
            "analogy": f"Analogía simulada sobre {concept} en estilo {style}",
            "external_resources": [],
            "guided_practice": {}
        }
        
    prompt = f"""
    Explica el concepto '{concept}' usando el siguiente estilo/analogía: {style}.
    
    Responde ÚNICAMENTE con un objeto JSON válido:
    {{
        "analogy": "Texto de la analogía",
        "external_resources": [
            {{"title": "Video de refuerzo", "url": "https://youtube.com/..."}}
        ],
        "guided_practice": {{"pregunta": "...", "respuesta": "..."}}
    }}
    """
    
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL_GEN,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)
