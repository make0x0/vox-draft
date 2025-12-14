import os
import re
import yaml
from pathlib import Path
from pydantic_settings import BaseSettings

# Helper for decrypting ENC: prefixed values
def _decrypt_value(value: str) -> str:
    """Decrypt value if it has ENC: prefix."""
    if not value:
        return value
    if value.startswith("ENC:"):
        try:
            from app.services.crypto import decrypt
            return decrypt(value)
        except Exception as e:
            print(f"[Config] WARNING: Failed to decrypt value: {e}")
    return value

class Settings(BaseSettings):
    # Database (still from env as it's infrastructure config)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/vox")
    
    # API Keys - loaded from settings.yaml (set by load_credentials)
    OPENAI_API_KEY: str = ""
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_AD_TOKEN: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    GEMINI_API_KEY: str = ""

    # Loaded from config.yaml
    ALLOWED_ORIGINS: list = ["*"]
    STT_API_URL: str = ""
    STT_PROVIDER: str = "openai"
    STT_GEMINI_MODEL: str = "gemini-2.5-flash"
    STT_AZURE_DEPLOYMENT: str = "whisper"
    STT_AZURE_API_VERSION: str = "2024-06-01"
    STT_AZURE_ENDPOINT: str = ""
    STT_AZURE_ENDPOINT_RAW: str = ""
    STT_TIMEOUT: float = 60.0
    STT_MAX_RETRIES: int = 3

    LLM_API_URL: str = ""
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o"
    LLM_GEMINI_MODEL: str = "gemini-2.5-flash"
    LLM_AZURE_DEPLOYMENT: str = "gpt-4o"
    LLM_AZURE_API_VERSION: str = "2024-06-01"
    LLM_AZURE_ENDPOINT: str = ""
    LLM_AZURE_ENDPOINT_RAW: str = ""
    LLM_TIMEOUT: float = 60.0
    LLM_MAX_RETRIES: int = 3

    TIMEZONE: str = "UTC"
    DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    NOTIFICATIONS: dict = {}

    class Config:
        # Only load DATABASE_URL from .env (infrastructure config)
        env_file = ".env"

# Path to settings.yaml
SETTINGS_YAML_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "settings.yaml"

def load_credentials():
    """Load API credentials from settings.yaml with decryption support."""
    if not SETTINGS_YAML_PATH.exists():
        print(f"[Config] No settings.yaml found at {SETTINGS_YAML_PATH}, using defaults")
        return
    
    try:
        with open(SETTINGS_YAML_PATH, "r", encoding="utf-8") as f:
            yaml_data = yaml.safe_load(f) or {}
        
        general = yaml_data.get("general", {})
        
        # Load and decrypt API keys
        settings.OPENAI_API_KEY = _decrypt_value(str(general.get("openai_api_key", "") or ""))
        settings.AZURE_OPENAI_API_KEY = _decrypt_value(str(general.get("azure_openai_api_key", "") or ""))
        settings.AZURE_OPENAI_AD_TOKEN = _decrypt_value(str(general.get("azure_openai_ad_token", "") or ""))
        settings.AZURE_OPENAI_ENDPOINT = str(general.get("azure_openai_endpoint", "") or "")
        settings.GEMINI_API_KEY = _decrypt_value(str(general.get("gemini_api_key", "") or ""))
        
        # Load provider settings from general (these override config.yaml)
        if general.get("stt_provider"):
            settings.STT_PROVIDER = general.get("stt_provider")
        if general.get("stt_gemini_model"):
            settings.STT_GEMINI_MODEL = general.get("stt_gemini_model")
        if general.get("llm_provider"):
            settings.LLM_PROVIDER = general.get("llm_provider")
        if general.get("llm_gemini_model"):
            settings.LLM_GEMINI_MODEL = general.get("llm_gemini_model")
            
        print(f"[Config] Loaded credentials from settings.yaml")
        
    except Exception as e:
        print(f"[Config] Error loading settings.yaml: {e}")

def load_config():
    """Load system configuration from config.yaml."""
    config_path = Path("config.yaml")
    if config_path.exists():
        with open(config_path, "r") as f:
            yaml_config = yaml.safe_load(f)
            
            system = yaml_config.get("system", {})
            stt = system.get("stt", {})
            llm = system.get("llm", {})

            settings.ALLOWED_ORIGINS = system.get("server", {}).get("allowed_origins", ["*"])
            
            settings.STT_API_URL = stt.get("openai_api_url", "")
            settings.STT_PROVIDER = stt.get("provider", "openai")
            settings.STT_GEMINI_MODEL = stt.get("gemini_model", "gemini-2.5-flash")
            settings.STT_AZURE_DEPLOYMENT = stt.get("azure_deployment", "whisper")
            settings.STT_AZURE_API_VERSION = stt.get("azure_api_version", "2024-06-01")
            settings.STT_AZURE_ENDPOINT = stt.get("azure_endpoint", "")
            settings.STT_AZURE_ENDPOINT_RAW = settings.STT_AZURE_ENDPOINT
            settings.STT_TIMEOUT = float(stt.get("timeout", 60.0))
            settings.STT_MAX_RETRIES = int(stt.get("max_retries", 3))
            _parse_azure_config(settings, "STT", settings.STT_AZURE_ENDPOINT)

            settings.LLM_API_URL = llm.get("openai_api_url", "")
            settings.LLM_PROVIDER = llm.get("provider", "openai")
            settings.LLM_MODEL = llm.get("model", "gpt-4o")
            settings.LLM_GEMINI_MODEL = llm.get("gemini_model", "gemini-2.5-flash")
            settings.LLM_AZURE_DEPLOYMENT = llm.get("azure_deployment", "gpt-4o")
            settings.LLM_AZURE_API_VERSION = llm.get("azure_api_version", "2024-06-01")
            settings.LLM_AZURE_ENDPOINT = llm.get("azure_endpoint", "")
            settings.LLM_AZURE_ENDPOINT_RAW = settings.LLM_AZURE_ENDPOINT
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
    match = re.search(r"^(.*?)/openai/deployments/([^/\?]+)", raw_endpoint)
    if match:
        base_endpoint = match.group(1) + "/"
        deployment = match.group(2)
        
        setattr(settings_obj, f"{prefix}_AZURE_ENDPOINT", base_endpoint)
        setattr(settings_obj, f"{prefix}_AZURE_DEPLOYMENT", deployment)
        
        version_match = re.search(r"api-version=([^&]+)", raw_endpoint)
        if version_match:
            api_version = version_match.group(1)
            setattr(settings_obj, f"{prefix}_AZURE_API_VERSION", api_version)
            print(f"Parsed Azure {prefix} URL: Endpoint={base_endpoint}, Deployment={deployment}, Version={api_version}")
        else:
            print(f"Parsed Azure {prefix} URL: Endpoint={base_endpoint}, Deployment={deployment} (Version not found in URL)")

settings = Settings()
load_config()
# Load credentials AFTER config (settings.yaml overrides for provider/model)
load_credentials()
