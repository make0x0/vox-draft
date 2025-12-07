import os
import re
import yaml
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/vox")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Loaded from yaml
    # Azure Env Vars
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_AD_TOKEN: str = os.getenv("AZURE_OPENAI_AD_TOKEN", "") # Bearer Token support
    AZURE_OPENAI_ENDPOINT: str = "" # Set by yaml logic only

    # Loaded from yaml
    ALLOWED_ORIGINS: list = ["*"]
    STT_API_URL: str = ""
    STT_PROVIDER: str = "openai"
    STT_AZURE_DEPLOYMENT: str = "whisper"
    STT_AZURE_API_VERSION: str = "2024-06-01"
    STT_AZURE_ENDPOINT: str = ""
    STT_TIMEOUT: float = 60.0
    STT_MAX_RETRIES: int = 3

    LLM_API_URL: str = ""
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o"
    LLM_AZURE_DEPLOYMENT: str = "gpt-4o"
    LLM_AZURE_API_VERSION: str = "2024-06-01"
    LLM_AZURE_ENDPOINT: str = ""
    LLM_TIMEOUT: float = 60.0
    LLM_MAX_RETRIES: int = 3

    TIMEZONE: str = "UTC"
    DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    NOTIFICATIONS: dict = {}

    class Config:
        env_file = ".env"

def load_config():
    config_path = Path("config.yaml")
    if config_path.exists():
        with open(config_path, "r") as f:
            yaml_config = yaml.safe_load(f)
            
            system = yaml_config.get("system", {})
            stt = system.get("stt", {})
            llm = system.get("llm", {})

            # Global Env Fallback -> REMOVED to enforce config.yaml source
            # default_azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")

            settings.ALLOWED_ORIGINS = system.get("server", {}).get("allowed_origins", ["*"])
            
            settings.STT_API_URL = stt.get("openai_api_url", "")
            settings.STT_PROVIDER = stt.get("provider", "openai")
            settings.STT_AZURE_DEPLOYMENT = stt.get("azure_deployment", "whisper")
            settings.STT_AZURE_API_VERSION = stt.get("azure_api_version", "2024-06-01")
            settings.STT_AZURE_ENDPOINT = stt.get("azure_endpoint", "") # Must be in YAML
            settings.STT_TIMEOUT = float(stt.get("timeout", 60.0))
            settings.STT_MAX_RETRIES = int(stt.get("max_retries", 3))
            _parse_azure_config(settings, "STT", settings.STT_AZURE_ENDPOINT)

            settings.LLM_API_URL = llm.get("openai_api_url", "")
            settings.LLM_PROVIDER = llm.get("provider", "openai")
            settings.LLM_MODEL = llm.get("model", "gpt-4o")
            settings.LLM_AZURE_DEPLOYMENT = llm.get("azure_deployment", "gpt-4o")
            settings.LLM_AZURE_API_VERSION = llm.get("azure_api_version", "2024-06-01")
            settings.LLM_AZURE_ENDPOINT = llm.get("azure_endpoint", "") # Must be in YAML
            settings.LLM_TIMEOUT = float(llm.get("timeout", 60.0))
            settings.LLM_MAX_RETRIES = int(llm.get("max_retries", 3))
            _parse_azure_config(settings, "LLM", settings.LLM_AZURE_ENDPOINT)
            
            app_config = system.get("app", {})
            settings.TIMEZONE = app_config.get("timezone", "UTC")
            settings.DATE_FORMAT = app_config.get("date_format", "%Y-%m-%d %H:%M:%S")
            settings.NOTIFICATIONS = app_config.get("notifications", {})

def _parse_azure_config(settings_obj, prefix, raw_endpoint):
    """
    If raw_endpoint is a full URL (e.g. .../openai/deployments/name/...),
    extract base endpoint and deployment name, and update settings.
    """
    if not raw_endpoint:
        return

    # Pattern: https://{host}/openai/deployments/{deployment}/...
    # Use non-greedy match for base endpoint to support paths (e.g. APIM)
    match = re.search(r"^(.*?)/openai/deployments/([^/]+)", raw_endpoint)
    if match:
        base_endpoint = match.group(1) + "/"
        deployment = match.group(2)
        
        # Update settings dynamically
        setattr(settings_obj, f"{prefix}_AZURE_ENDPOINT", base_endpoint)
        setattr(settings_obj, f"{prefix}_AZURE_DEPLOYMENT", deployment)
        print(f"Parsed Azure {prefix} URL: Endpoint={base_endpoint}, Deployment={deployment}")

settings = Settings()
load_config()
