from openai import OpenAI, AzureOpenAI
from app.core.config import settings

def get_openai_client(service_type: str = "llm"):
    """
    Factory to return either standard OpenAI client or AzureOpenAI client
    based on configuration.
    
    Args:
        service_type: "llm" or "stt"
    """
    
    
    # Dynamic Settings Overlay
    from app.services.settings_file import settings_service
    user_settings = {}
    try:
        user_settings = settings_service.get_general_settings()
    except:
        pass

    # Determine Provider
    provider = settings.LLM_PROVIDER if service_type == "llm" else settings.STT_PROVIDER
    if service_type == "llm" and user_settings.get("llm_provider"):
        provider = user_settings.get("llm_provider")
    elif service_type == "stt" and user_settings.get("stt_provider"):
        provider = user_settings.get("stt_provider")

    timeout = settings.LLM_TIMEOUT if service_type == "llm" else settings.STT_TIMEOUT
    max_retries = settings.LLM_MAX_RETRIES if service_type == "llm" else settings.STT_MAX_RETRIES
    
    # --- OpenAI Params ---
    openai_api_key = user_settings.get("openai_api_key")
    
    # --- Azure Params ---
    azure_api_key = user_settings.get("azure_openai_api_key")
    azure_ad_token = user_settings.get("azure_openai_ad_token")
    azure_endpoint = user_settings.get("azure_openai_endpoint")
    azure_api_version = settings.LLM_AZURE_API_VERSION if service_type == "llm" else settings.STT_AZURE_API_VERSION # Version usually static or from env/yaml config load



    if provider == "azure":
        # Azure Configuration
        # Choose endpoint based on service_type
        azure_endpoint_specific = None
        if service_type == "stt":
            azure_endpoint_specific = user_settings.get("azure_openai_stt_endpoint")
        elif service_type == "llm":
            azure_endpoint_specific = user_settings.get("azure_openai_llm_endpoint")
            
        endpoint = azure_endpoint_specific or azure_endpoint
        
        # Note: Azure OpenAI client requires (api_key OR azure_ad_token), api_version, and azure_endpoint
        if not endpoint:
             print(f"Warning: Azure {service_type} selected but endpoint missing.")

        api_version = azure_api_version
        
        # Auth Strategy: AD Token > API Key
        if azure_ad_token:
            return AzureOpenAI(
                azure_ad_token=azure_ad_token,
                api_version=api_version,
                azure_endpoint=endpoint,
                timeout=timeout,
                max_retries=max_retries
            )
        elif azure_api_key:
             return AzureOpenAI(
                api_key=azure_api_key,
                api_version=api_version,
                azure_endpoint=endpoint,
                timeout=timeout,
                max_retries=max_retries
            )
        else:
             raise ValueError("Azure OpenAI selected but API Key or AD Token is missing. Please check your Settings.")
    else:
        # Standard OpenAI
        return OpenAI(
            api_key=openai_api_key,
            timeout=timeout,
            max_retries=max_retries
        )
