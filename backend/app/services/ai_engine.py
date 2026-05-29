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
        "basico": "Usa lenguaje muy simple, analogías cotidianas y ejemplos concretos. Explica como si tuvieras 10 años.",
        "intermedio": "Usa lenguaje claro con algunos términos técnicos bien explicados. Proporciona ejemplos prácticos.",
        "avanzado": "Usa terminología precisa y profundiza en los detalles técnicos y académicos."
    }.get(difficulty_level, "Usa lenguaje claro y educativo.")
    
    history_text = "\n".join([f"{'Estudiante' if m['role'] == 'user' else 'Tutor'}: {m['content']}" for m in conversation_history[-6:-1]])
    
    prompt = f"""
    Eres un tutor educativo experto en el concepto: {concept}.
    
    {level_prompt}
    
    Historial reciente de la conversación:
    {history_text}
    
    Pregunta del estudiante: {question}
    
    Responde de manera clara y útil, adaptándote al nivel del estudiante.
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

    Reglas:
    - 1 nodo introductorio de teoria
    - Varios nodos de teoria intercalados con quizzes
    - 1 nodo boss (examen final) al final
    - Los prerequisites deben referenciar los IDs de nodos anteriores
    - Distribucion: ~60% theory, ~20% quiz, ~10% practice, ~10% boss

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
        "no entiendo": f"¡Entiendo! Vamos a explicar '{concept}' de una forma más sencilla. Imagina que {concept} es como...",
        "explica": f"Claro, '{concept}' se refiere a un concepto importante. Déjame darte una explicación más detallada...",
        "ejemplo": f"¡Excelente pregunta! Aquí tienes un ejemplo práctico sobre '{concept}'...",
    }
    
    question_lower = question.lower()
    for key, response in responses.items():
        if key in question_lower:
            return response
    return f"Excelente pregunta sobre '{concept}'. Déjame explicarte con más detalle: {concept} es fundamental para entender este tema porque..."
