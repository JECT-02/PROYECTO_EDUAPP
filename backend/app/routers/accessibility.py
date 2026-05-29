from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.dependencies import require_role
from app.schemas import VoiceCommandRequest, VoiceCommandResponse

router = APIRouter(prefix="/api/accessibility", tags=["accessibility"])

@router.post("/voice-command", response_model=VoiceCommandResponse)
async def process_voice_command(
    request: VoiceCommandRequest,
    current_user: User = Depends(require_role(["student"])), db: AsyncSession = Depends(get_db)
):
    command = request.command.lower()
    action = "unknown"
    params = {}
    tts = "No entendí el comando."
    
    if "siguiente" in command or "avanzar" in command:
        action = "navigate"
        params = {"direction": "next"}
        tts = "Avanzando a la siguiente sección."
    elif "repetir" in command:
        action = "read_content"
        tts = "Repitiendo el contenido actual."
    elif "explicar" in command or "no entiendo" in command:
        action = "reinforcement"
        tts = "Claro, vamos a explicarlo de otra forma."
        
    return VoiceCommandResponse(action=action, params=params, tts_feedback=tts)
