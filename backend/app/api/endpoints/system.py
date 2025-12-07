from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/config")
def get_system_config():
    """
    Expose public system configuration to the frontend.
    BE CAREFUL not to expose sensitive secrets here.
    """
    return {
        "notifications": settings.NOTIFICATIONS,
        "stt": {
             # Add other public configs here if needed later
             "timeout": settings.STT_TIMEOUT
        },
        "llm": {
             "timeout": settings.LLM_TIMEOUT
        }
    }
