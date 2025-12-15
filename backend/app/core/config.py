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
    AZURE_OPENAI_ENDPOINT: str = "" # Fallback/Legacy
    AZURE_OPENAI_STT_ENDPOINT: str = ""
    AZURE_OPENAI_LLM_ENDPOINT: str = ""
    GEMINI_API_KEY: str = ""

    # Loaded from config.yaml
    ALLOWED_ORIGINS: list = ["*"]
    STT_PROVIDER: str = "openai"
    STT_OPENAI_API_URL: str = ""
    STT_GEMINI_MODEL: str = "gemini-2.5-flash"
    STT_AZURE_DEPLOYMENT: str = "whisper"
    STT_AZURE_API_VERSION: str = "2024-06-01"
    STT_TIMEOUT: float = 60.0
    STT_MAX_RETRIES: int = 3

    LLM_PROVIDER: str = "openai"
    LLM_OPENAI_API_URL: str = ""
    LLM_MODEL: str = "gpt-4o"
    LLM_GEMINI_MODEL: str = "gemini-2.5-flash"
    LLM_AZURE_DEPLOYMENT: str = "gpt-4o"
    LLM_AZURE_API_VERSION: str = "2024-06-01"
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
        
        # Load Endpoints (No decryption needed for URLs)
        settings.AZURE_OPENAI_ENDPOINT = str(general.get("azure_openai_endpoint", "") or "")
        settings.AZURE_OPENAI_STT_ENDPOINT = str(general.get("azure_openai_stt_endpoint", "") or "")
        settings.AZURE_OPENAI_LLM_ENDPOINT = str(general.get("azure_openai_llm_endpoint", "") or "")

        settings.GEMINI_API_KEY = _decrypt_value(str(general.get("gemini_api_key", "") or ""))
        
        # Load provider/model settings (settings.yaml is the single source of truth)
        settings.STT_PROVIDER = general.get("stt_provider", "openai")
        settings.STT_GEMINI_MODEL = general.get("stt_gemini_model", "gemini-1.5-flash")
        settings.LLM_PROVIDER = general.get("llm_provider", "openai")
        settings.LLM_GEMINI_MODEL = general.get("llm_gemini_model", "gemini-1.5-flash")
            
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
            
            # STT settings (provider is loaded from settings.yaml)
            settings.STT_OPENAI_API_URL = str(stt.get("openai_api_url", ""))
            settings.STT_TIMEOUT = float(stt.get("timeout", 60.0))
            settings.STT_MAX_RETRIES = int(stt.get("max_retries", 3))

            # LLM settings (provider is loaded from settings.yaml)
            settings.LLM_OPENAI_API_URL = str(llm.get("openai_api_url", ""))
            settings.LLM_TIMEOUT = float(llm.get("timeout", 60.0))
            settings.LLM_MAX_RETRIES = int(llm.get("max_retries", 3))
            
            app_config = system.get("app", {})
            settings.TIMEZONE = app_config.get("timezone", "UTC")
            settings.DATE_FORMAT = app_config.get("date_format", "%Y-%m-%d %H:%M:%S")
            settings.NOTIFICATIONS = app_config.get("notifications", {})

def _parse_azure_config(settings_obj, prefix, raw_endpoint):
    # Deprecated/Unused helper, keeping for safety or removing? 
    # User asked to remove loading logic, so we can remove this function entirely if unused.
    pass

settings = Settings()
load_config()
# Load credentials AFTER config (settings.yaml overrides for provider/model)
load_credentials()
