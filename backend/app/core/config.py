import os
import yaml
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/vox")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Loaded from yaml
    ALLOWED_ORIGINS: list = ["*"]
    STT_API_URL: str = ""
    LLM_API_URL: str = ""
    LLM_MODEL: str = "gpt-4o"
    TIMEZONE: str = "UTC"
    DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"

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

            settings.ALLOWED_ORIGINS = system.get("server", {}).get("allowed_origins", ["*"])
            settings.STT_API_URL = stt.get("openai_api_url", "")
            settings.LLM_API_URL = llm.get("openai_api_url", "")
            settings.LLM_MODEL = llm.get("model", "gpt-4o")
            
            app_config = system.get("app", {})
            settings.TIMEZONE = app_config.get("timezone", "UTC")
            settings.DATE_FORMAT = app_config.get("date_format", "%Y-%m-%d %H:%M:%S")

settings = Settings()
load_config()
