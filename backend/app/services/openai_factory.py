from openai import OpenAI, AzureOpenAI
from app.core.config import settings
import re
from app.core.logging import log_safe

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

        # Parse Azure URL components for Runtime Client
        base_endpoint = endpoint
        deployment_name = None
        
        # Extract deployment from URL: .../deployments/{name}/...
        if endpoint:
            dep_match = re.search(r"/openai/deployments/([^/]+)", endpoint)
            if dep_match:
                deployment_name = dep_match.group(1)
            
            # Extract Base Endpoint
            base_match = re.search(r"^(https?://[^/]+)", endpoint)
            if base_match:
                base_endpoint = base_match.group(1) + "/"

            # Extract Version from URL query param if present
            ver_match = re.search(r"[?&]api-version=([^&]+)", endpoint)
            if ver_match:
                api_version = ver_match.group(1)

        client_args = {
            "api_version": api_version,
            "azure_endpoint": base_endpoint,
            "timeout": timeout,
            "max_retries": max_retries
        }
        
        if deployment_name:
            client_args["azure_deployment"] = deployment_name

        # Auth Strategy: AD Token > API Key
        if azure_ad_token:
            client_args["azure_ad_token"] = azure_ad_token
        elif azure_api_key:
            client_args["api_key"] = azure_api_key
        else:
             raise ValueError("Azure OpenAI selected but API Key or AD Token is missing. Please check your Settings.")
             
        return AzureOpenAI(**client_args)

    else:
        # Standard OpenAI
        client_args = {
            "api_key": openai_api_key,
            "timeout": timeout,
            "max_retries": max_retries
        }
        
        # Use custom base_url if configured (from config.yaml)
        if service_type == "stt" and settings.STT_OPENAI_API_URL:
            client_args["base_url"] = settings.STT_OPENAI_API_URL
        elif service_type == "llm" and settings.LLM_OPENAI_API_URL:
            client_args["base_url"] = settings.LLM_OPENAI_API_URL

        return OpenAI(**client_args)
