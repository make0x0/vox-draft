from openai import OpenAI, AzureOpenAI
from app.core.config import settings

def get_openai_client(service_type: str = "llm"):
    """
    Factory to return either standard OpenAI client or AzureOpenAI client
    based on configuration.
    
    Args:
        service_type: "llm" or "stt"
    """
    
    
    provider = settings.LLM_PROVIDER if service_type == "llm" else settings.STT_PROVIDER
    timeout = settings.LLM_TIMEOUT if service_type == "llm" else settings.STT_TIMEOUT
    max_retries = settings.LLM_MAX_RETRIES if service_type == "llm" else settings.STT_MAX_RETRIES

    if provider == "azure":
        # Azure Configuration
        endpoint = settings.LLM_AZURE_ENDPOINT if service_type == "llm" else settings.STT_AZURE_ENDPOINT
        
        # Note: Azure OpenAI client requires (api_key OR azure_ad_token), api_version, and azure_endpoint
        if not endpoint:
             print(f"Warning: Azure {service_type} selected but endpoint missing.")

        api_version = settings.LLM_AZURE_API_VERSION if service_type == "llm" else settings.STT_AZURE_API_VERSION
        
        # Auth Strategy: AD Token > API Key
        if settings.AZURE_OPENAI_AD_TOKEN:
            return AzureOpenAI(
                azure_ad_token=settings.AZURE_OPENAI_AD_TOKEN,
                api_version=api_version,
                azure_endpoint=endpoint,
                timeout=timeout,
                max_retries=max_retries
            )
        else:
             return AzureOpenAI(
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=api_version,
                azure_endpoint=endpoint,
                timeout=timeout,
                max_retries=max_retries
            )
    else:
        # Standard OpenAI
        return OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=timeout,
            max_retries=max_retries
        )
