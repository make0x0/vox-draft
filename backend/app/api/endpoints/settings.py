from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.services.settings_file import settings_service
from app.schemas import settings as settings_schema
from app.core.config import settings as app_settings
from openai import OpenAI, AzureOpenAI
import google.generativeai as genai

router = APIRouter()

@router.get("/")
def get_settings():
    return settings_service.get_general_settings()

@router.patch("/")
def update_settings(settings: Dict[str, Any]):
    return settings_service.update_general_settings(settings)

@router.post("/test")
def test_connection(request: settings_schema.TestConnectionRequest):
    provider = request.provider
    
    try:
        if provider == "openai":
            api_key = request.openai_api_key or app_settings.OPENAI_API_KEY
            if not api_key:
                raise ValueError("OpenAI API Key is missing.")
            
            client = OpenAI(api_key=api_key, timeout=10.0, max_retries=1)
            # Lightweight check: list models
            client.models.list()
            return {"ok": True, "message": "Successfully connected to OpenAI."}

        elif provider == "azure":
            # Strict check: If user sends empty strings, we should NOT fall back to app_settings
            # unless the intention is to "test current effective settings".
            
            service_type = request.service_type or "llm"
            
            # Select Endpoint based on service_type
            endpoint = None
            if service_type == "stt":
                endpoint = request.azure_openai_stt_endpoint
            elif service_type == "llm":
                endpoint = request.azure_openai_llm_endpoint
            
            # Fallback to generic endpoint or app_settings if specific one is missing
            if not endpoint:
                endpoint = request.azure_openai_endpoint
                
            if not endpoint:
                 # Fallback only if None (not passed)
                 if service_type == "stt":
                    endpoint = app_settings.AZURE_OPENAI_STT_ENDPOINT or app_settings.AZURE_OPENAI_ENDPOINT
                 else:
                    endpoint = app_settings.AZURE_OPENAI_LLM_ENDPOINT or app_settings.AZURE_OPENAI_ENDPOINT
            
            if not endpoint:
                raise ValueError(f"Azure Endpoint for {service_type} is missing.")

            ad_token = request.azure_openai_ad_token
            api_key = request.azure_openai_api_key
            
            # If both are empty strings?
            if (ad_token == "") and (api_key == ""):
                 raise ValueError("Azure API Key or AD Token is required.")

            # Fallback only if None
            if ad_token is None: ad_token = app_settings.AZURE_OPENAI_AD_TOKEN
            if api_key is None: api_key = app_settings.AZURE_OPENAI_API_KEY
            
            api_version = app_settings.LLM_AZURE_API_VERSION
            
            if ad_token:
                client = AzureOpenAI(
                    azure_ad_token=ad_token,
                    api_version=api_version,
                    azure_endpoint=endpoint,
                    timeout=10.0,
                    max_retries=1
                )
            elif api_key:
                client = AzureOpenAI(
                    api_key=api_key,
                    api_version=api_version,
                    azure_endpoint=endpoint,
                    timeout=10.0,
                    max_retries=1
                )
            else:
                 raise ValueError("Azure API Key or AD Token is required.")

            # Lightweight check? Azure sometimes restricts models.list
            # Try correct one
            try:
                client.models.list()
            except Exception as e:
                # If models.list fails (common in Azure strict policies), try a dummy completion?
                # But we don't know deployment name here easily? request.deployment? 
                # Let's stick to models.list and error implies auth/connect failure usually.
                raise e
                
            return {"ok": True, "message": "Successfully connected to Azure OpenAI."}

        elif provider == "gemini":
            api_key = request.gemini_api_key or app_settings.GEMINI_API_KEY
            if not api_key:
                 raise ValueError("Gemini API Key is missing.")
            
            genai.configure(api_key=api_key)
            # List models
            list(genai.list_models())
            return {"ok": True, "message": "Successfully connected to Google Gemini."}

        else:
            return {"ok": False, "message": f"Unknown provider: {provider}"}

    except Exception as e:
        print(f"Connection Test Failed: {e}")
        return {"ok": False, "message": f"Connection Failed: {str(e)}"}

@router.get("/models/{provider}")
def get_provider_models(provider: str):
    """
    Fetch available models for a specific provider.
    Currently only supports 'gemini'.
    """
    if provider == "gemini":
        from app.services.gemini_service import gemini_service
        models = gemini_service.get_available_models()
        return {"models": models}
    
    # For others, return empty or default?
    # OpenAI/Azure usually don't have a simple public list API without auth or complex parsing
    return {"models": []}
