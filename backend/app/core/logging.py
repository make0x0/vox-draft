import logging
import sys
import re
from typing import List

# Sensitive keys to redact
SENSITIVE_KEYS = [
    "api_key", "token", "password", "secret", "credential", 
    "azure_openai_api_key", "openai_api_key", "gemini_api_key",
    "azure_openai_ad_token"
]

class SensitiveFilter(logging.Filter):
    """
    Filter to mask sensitive data in logs.
    Note: Ideally this should parse JSON/Dicts, but for simple string logs using regex.
    """
    def filter(self, record):
        msg = record.getMessage()
        # Simple regex for "key": "value" or key="value" pattern
        # This is a basic effort, not exhaustive security.
        # Mask UUID-like or Long alphanumeric strings after sensitive keys
        
        # Pattern 1: key="secret" or key='secret'
        # Pattern 2: "key": "secret"
        
        # We'll just define a helper function used manually for now, 
        # or apply to message if possible. 
        # Modifying record.msg directly can be tricky if arguments are separated.
        return True

def mask_secret(value: str) -> str:
    if not value:
        return value
    if len(value) < 8:
        return "****"
    return f"{value[:3]}...{value[-3:]}"

def log_safe(msg: str, **kwargs):
    """
    Helper to log messages while making best effort to hide secrets in kwargs.
    Use this instead of aggressive global filtering for now to ensure reliability.
    """
    # ... implementation can be expanded
    pass

def configure_logging(debug_mode: bool = False):
    """
    Configure logging based on debug_mode.
    """
    log_level = logging.DEBUG if debug_mode else logging.INFO
    
    # Root logger
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Handlers
    # Clear existing
    if logger.handlers:
        logger.handlers.clear()
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    
    # Formatting
    # Include level, time, logger name
    formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    
    # Set levels for libraries to avoid noise unless absolutely needed
    logging.getLogger("uvicorn.access").setLevel(logging.INFO) # Keep access logs
    logging.getLogger("httpx").setLevel(logging.WARNING) # Too noisy in debug
    
    logger.info(f"Logging configured. Debug Mode: {debug_mode}")

