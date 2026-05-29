from google import genai
from google.genai import types
from app.config import get_settings
import json
import asyncio

settings = get_settings()
genai_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

async def _gemini_generate(prompt: str, response_schema=None) -> str:
    """Helper to call Gemini with JSON mode."""
    if not genai_client:
        return None
    
    config = {}
    if response_schema:
        config["response_mime_type"] = "application/json"
        config["response_schema"] = response_schema
    
    def _sync_call():
        return genai_client.models.generate_content(
            model=settings.GEMINI_MODEL_GEN,
            contents=prompt,
            config=config,
        )
    
    return await asyncio.to_thread(_sync_call)


# ---- Public API ----

async def generate_lesson_content(topic: str, context: str, sync_score: float) -> dict:
    if not genai_client:
        return {
            "content_html": f"<p>Contenido simulado para <b>{topic}</b>.</p><p><concept>Concepto clave simulado</concept></p>",
            "key_concepts": ["Concepto clave simulado"]
        }
        
    tone_instruction = "Usa lenguaje claro y educativo."
    if sync_score < 0.4:
        tone_instruction = "Usa analogias muy simples, explicaciones paso a paso y lenguaje basico."
    elif sync_score > 0.8:
        tone_instruction = "Usa lenguaje tecnico preciso y academico formal."
        
    prompt = f"""
    Eres un tutor experto en {topic}. Crea una leccion teorica corta basada en el siguiente contexto:
    {context}
    
    Instrucciones de tono: {tone_instruction}
    
    Debes envolver los conceptos clave mas importantes con la etiqueta HTML personalizada <concept>concepto</concept>.
    
    Responde UNICAMENTE con un objeto JSON valido con la siguiente estructura:
    {{
        "content_html": "HTML de la leccion usando <p>, <ul>, etc.",
        "key_concepts": ["lista", "de", "conceptos"]
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
        return json.loads(response.text)
    return {"content_html": "<p>Contenido no disponible</p>", "key_concepts": []}


async def generate_quiz_questions(topic: str, context: str, weaknesses: list = []) -> list:
    if not genai_client:
        return [
            {
                "id": "q1",
                "text": f"Pregunta simulada sobre {topic}?",
                "type": "multiple_choice",
                "options": {"a": "Opcion 1", "b": "Opcion 2", "c": "Opcion 3", "d": "Opcion 4"},
                "correct_answer": "a",
                "explanation": "Explicacion simulada",
                "concept_tag": "Simulado"
            }
        ]
        
    weaknesses_str = ", ".join(weaknesses) if weaknesses else "Ninguna debilidad especifica."
    
    prompt = f"""
    Crea 3 preguntas tipo test sobre {topic} basadas en:
    {context}
    
    Presta especial atencion a estos conceptos debiles: {weaknesses_str}
    
    Responde UNICAMENTE con un objeto JSON valido con la siguiente estructura:
    {{
        "questions": [
            {{
                "id": "q1",
                "text": "Texto de pregunta",
                "type": "multiple_choice",
                "options": {{"a": "opcion", "b": "opcion", "c": "opcion", "d": "opcion"}},
                "correct_answer": "a",
                "explanation": "Por que la 'a' es correcta",
                "concept_tag": "Concepto evaluado"
            }}
        ]
    }}
    """
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "questions": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": {"type": "STRING"},
                        "text": {"type": "STRING"},
                        "type": {"type": "STRING"},
                        "options": {"type": "OBJECT", "properties": {"a": {"type": "STRING"}, "b": {"type": "STRING"}, "c": {"type": "STRING"}, "d": {"type": "STRING"}}},
                        "correct_answer": {"type": "STRING"},
                        "explanation": {"type": "STRING"},
                        "concept_tag": {"type": "STRING"}
                    },
                    "required": ["id", "text", "type", "options", "correct_answer", "explanation", "concept_tag"]
                }
            }
        },
        "required": ["questions"]
    }
    
    response = await _gemini_generate(prompt, schema)
    if response and response.text:
        data = json.loads(response.text)
        return data.get("questions", [])
    return []


async def generate_reinforcement(concept: str, style: str) -> dict:
    if not genai_client:
        return {
            "analogy": f"Analogia simulada sobre {concept} en estilo {style}",
            "external_resources": [],
            "guided_practice": {}
        }
        
    prompt = f"""
    Explica el concepto '{concept}' usando el siguiente estilo/analogia: {style}.
    
    Responde UNICAMENTE con un objeto JSON valido:
    {{
        "analogy": "Texto de la analogia",
        "external_resources": [
            {{"title": "Video de refuerzo", "url": "https://youtube.com/..."}}
        ],
        "guided_practice": {{"pregunta": "...", "respuesta": "..."}}
    }}
    """
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "analogy": {"type": "STRING"},
            "external_resources": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "title": {"type": "STRING"},
                        "url": {"type": "STRING"}
                    },
                    "required": ["title", "url"]
                }
            },
            "guided_practice": {"type": "OBJECT", "properties": {"pregunta": {"type": "STRING"}, "respuesta": {"type": "STRING"}}}
        },
        "required": ["analogy", "external_resources", "guided_practice"]
    }
    
    response = await _gemini_generate(prompt, schema)
    if response and response.text:
        return json.loads(response.text)
    return {"analogy": "", "external_resources": [], "guided_practice": {}}


async def generate_chat_response(concept: str, question: str, difficulty_level: str, conversation_history: list) -> str:
    """
    Generate an AI tutor chat response that adapts to the student's level.
    """
    if not genai_client:
        return get_mock_chat_response(concept, question)
    
    level_prompt = {
        "basico": "Usa lenguaje muy simple, analogias cotidianas y ejemplos concretos. Explica como si tuvieras 10 anos.",
        "intermedio": "Usa lenguaje claro con algunos terminos tecnicos bien explicados. Proporciona ejemplos practicos.",
        "avanzado": "Usa terminologia precisa y profundiza en los detalles tecnicos y academicos."
    }.get(difficulty_level, "Usa lenguaje claro y educativo.")
    
    history_text = "\n".join([f"{'Estudiante' if m['role'] == 'user' else 'Tutor'}: {m['content']}" for m in conversation_history[-6:-1]])
    
    prompt = f"""
    Eres un tutor educativo experto en el concepto: {concept}.
    
    {level_prompt}
    
    Historial reciente de la conversacion:
    {history_text}
    
    Pregunta del estudiante: {question}
    
    Responde de manera clara y util, adaptandote al nivel del estudiante.
    """
    
    response = await _gemini_generate(prompt)
    if response and response.text:
        return response.text
    return get_mock_chat_response(concept, question)


async def generate_course_from_files(
    course_name: str,
    course_subject: str,
    course_desc: str,
    age_level: str,
    files_context: str = "",
    generate_topics: bool = True,
    generate_content: bool = True,
    generate_roadmap: bool = True,
) -> dict:
    """
    Generate a complete course structure with roadmap from uploaded files using Gemini.
    """
    if not genai_client:
        return None

    prompt = f"""
    Eres un experto en diseno curricular y pedagogia. Tu tarea es crear la estructura completa de un curso
    basandote en la siguiente informacion:

    Nombre del curso: {course_name}
    Materia: {course_subject}
    Descripcion: {course_desc}
    Nivel de edad: {age_level}

    Archivos de referencia subidos por el docente:
    {files_context}

    Basandote en los archivos de referencia, crea una estructura de curso con nodos de aprendizaje.
    Cada nodo debe ser uno de estos tipos: theory (teoria), practice (practica), quiz (evaluacion), boss (examen final).

    REGLAS OBLIGATORIAS (no las ignores):
    - 1 nodo introductorio de teoria al inicio
    - Cada 2 o maximo 3 nodos de teoria debe haber 1 nodo de quiz
      Ejemplo CORRECTO: theory, theory, quiz, theory, practice, quiz, theory, theory, quiz, boss
      Ejemplo INCORRECTO: theory, theory, theory, quiz (NUNCA 3+ teorias seguidas sin quiz)
    - 1 nodo boss (examen final) al final
    - Los prerequisites deben referenciar los IDs de nodos anteriores (ej. si n3 es quiz, sus prerequisites son n1,n2)
    - Distribucion: ~50% theory, ~20% quiz, ~15% practice, ~10% boss, ~5% reward

    Responde UNICAMENTE con un JSON valido:
    {{
        "nodes": [
            {{
                "id": "n1",
                "type": "theory",
                "title": "Titulo del nodo",
                "description": "Breve descripcion del contenido",
                "prerequisites": [],
                "metadata": {{"estimated_minutes": 15}},
                "content": {{
                    "content_html": "<p>Contenido educativo en HTML</p>",
                    "key_concepts": ["concepto1", "concepto2"]
                }}
            }}
        ]
    }}
    """

    schema = {
        "type": "OBJECT",
        "properties": {
            "nodes": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": {"type": "STRING"},
                        "type": {"type": "STRING"},
                        "title": {"type": "STRING"},
                        "description": {"type": "STRING"},
                        "prerequisites": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "metadata": {"type": "OBJECT", "properties": {"estimated_minutes": {"type": "INTEGER"}}},
                        "content": {
                            "type": "OBJECT",
                            "properties": {
                                "content_html": {"type": "STRING"},
                                "key_concepts": {"type": "ARRAY", "items": {"type": "STRING"}}
                            },
                            "required": ["content_html", "key_concepts"]
                        }
                    },
                    "required": ["id", "type", "title", "prerequisites"]
                }
            }
        },
        "required": ["nodes"]
    }

    response = await _gemini_generate(prompt, schema)
    if response and response.text:
        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            return None
    return None


def get_mock_chat_response(concept: str, question: str) -> str:
    """Fallback mock response when no API key is configured."""
    responses = {
        "no entiendo": f"Entiendo! Vamos a explicar '{concept}' de una forma mas sencilla. Imagina que {concept} es como...",
        "explica": f"Claro, '{concept}' se refiere a un concepto importante. Dejame darte una explicacion mas detallada...",
        "ejemplo": f"Excelente pregunta! Aqui tienes un ejemplo practico sobre '{concept}'...",
    }
    
    question_lower = question.lower()
    for key, response in responses.items():
        if key in question_lower:
            return response
    return f"Excelente pregunta sobre '{concept}'. Dejame explicarte con mas detalle: {concept} es fundamental para entender este tema porque..."
