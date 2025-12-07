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
             "provider": settings.STT_PROVIDER,
             "url": settings.STT_API_URL, # Kept for backward compat
             # Azure details
             "azure_deployment": settings.STT_AZURE_DEPLOYMENT,
             "azure_endpoint": settings.STT_AZURE_ENDPOINT,
             "timeout": settings.STT_TIMEOUT
        },
        "llm": {
             "provider": settings.LLM_PROVIDER,
             "model": settings.LLM_MODEL,
             "url": settings.LLM_API_URL, # Kept for backward compat
             # Azure details
             "azure_deployment": settings.LLM_AZURE_DEPLOYMENT,
             "azure_endpoint": settings.LLM_AZURE_ENDPOINT,
             "timeout": settings.LLM_TIMEOUT
        }
    }
