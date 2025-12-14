
import yaml
import os
from typing import List, Dict, Optional, Any
from pathlib import Path

# Path to the data directory. Assuming app is running from backend root or similar.
# We'll try to resolve it relative to this file.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SETTINGS_FILE = BASE_DIR / "data" / "settings.yaml"

class SettingsFileService:
    def __init__(self, file_path: Path = SETTINGS_FILE):
        self.file_path = file_path

    def _read_yaml(self) -> Dict[str, Any]:
        if not self.file_path.exists():
            return {"templates": [], "vocabulary": [], "system_prompts": {}}
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            print(f"Error reading settings.yaml: {e}")
            return {"templates": [], "vocabulary": [], "system_prompts": {}}

    def _write_yaml(self, data: Dict[str, Any]):
        try:
            # Ensure directory exists
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, "w", encoding="utf-8") as f:
                yaml.safe_dump(data, f, allow_unicode=True, default_flow_style=False)
        except Exception as e:
            print(f"Error writing settings.yaml: {e}")
            raise e

    # --- Templates ---
    def get_templates(self) -> List[Dict[str, Any]]:
        data = self._read_yaml()
        return data.get("templates", [])

    def add_template(self, template: Dict[str, Any]):
        data = self._read_yaml()
        if "templates" not in data:
            data["templates"] = []
        # Check if exists (update if id matches? or just append?)
        # For simplicity, if ID exists, update.
        existing = next((t for t in data["templates"] if t.get("id") == template.get("id")), None)
        if existing:
            existing.update(template)
        else:
            data["templates"].append(template)
        self._write_yaml(data)
        return template

    def update_template(self, template_id: str, updates: Dict[str, Any]):
        data = self._read_yaml()
        templates = data.get("templates", [])
        for t in templates:
            if t.get("id") == template_id:
                t.update(updates)
                self._write_yaml(data)
                return t
        return None

    def delete_template(self, template_id: str):
        data = self._read_yaml()
        templates = data.get("templates", [])
        data["templates"] = [t for t in templates if t.get("id") != template_id]
        self._write_yaml(data)

    # --- Vocabulary ---
    def get_vocabulary(self) -> List[Dict[str, Any]]:
        data = self._read_yaml()
        return data.get("vocabulary", [])

    def add_vocabulary_item(self, item: Dict[str, Any]):
        data = self._read_yaml()
        if "vocabulary" not in data:
            data["vocabulary"] = []
        # Simple append, generic ID check
        existing = next((v for v in data["vocabulary"] if v.get("id") == item.get("id")), None)
        if existing:
            existing.update(item)
        else:
            data["vocabulary"].append(item)
        self._write_yaml(data)
        return item
    
    def update_vocabulary_item(self, item_id: str, updates: Dict[str, Any]):
        data = self._read_yaml()
        vocab = data.get("vocabulary", [])
        for v in vocab:
            if v.get("id") == item_id:
                v.update(updates)
                self._write_yaml(data)
                return v
        return None

    def delete_vocabulary_item(self, item_id: str):
        data = self._read_yaml()
        vocab = data.get("vocabulary", [])
        data["vocabulary"] = [v for v in vocab if v.get("id") != item_id]
        self._write_yaml(data)

    # --- System Prompts ---
    def get_system_prompts(self) -> Dict[str, str]:
        data = self._read_yaml()
        return data.get("system_prompts", {})

    def get_system_prompt(self, key: str) -> Optional[str]:
        prompts = self.get_system_prompts()
        return prompts.get(key)
    
    def update_system_prompt(self, key: str, content: str):
        data = self._read_yaml()
        if "system_prompts" not in data:
            data["system_prompts"] = {}
        data["system_prompts"][key] = content
        self._write_yaml(data)

    # --- General Settings ---
    def get_general_settings(self) -> Dict[str, Any]:
        data = self._read_yaml()
        return data.get("general", {})

    # Fields that should be encrypted when saved
    SENSITIVE_FIELDS = [
        "openai_api_key",
        "azure_openai_api_key",
        "azure_openai_ad_token",
        "gemini_api_key",
    ]

    def _encrypt_sensitive_fields(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt sensitive fields if they're not already encrypted."""
        try:
            from app.services.crypto import encrypt, is_encrypted, PUBLIC_KEY_FILE
            
            # Check if encryption is available (keys exist)
            if not PUBLIC_KEY_FILE.exists():
                print("[Settings] Encryption keys not found, saving plaintext")
                return updates
            
            encrypted_updates = updates.copy()
            for field in self.SENSITIVE_FIELDS:
                if field in encrypted_updates:
                    value = encrypted_updates[field]
                    # Only encrypt if value is non-empty and not already encrypted
                    if value and isinstance(value, str) and not is_encrypted(value):
                        encrypted_updates[field] = encrypt(value)
                        print(f"[Settings] Encrypted field: {field}")
            
            return encrypted_updates
        except Exception as e:
            print(f"[Settings] Encryption failed, saving plaintext: {e}")
            return updates

    def update_general_settings(self, updates: Dict[str, Any]):
        data = self._read_yaml()
        if "general" not in data:
            data["general"] = {}
        
        # Encrypt sensitive fields before saving
        encrypted_updates = self._encrypt_sensitive_fields(updates)
        
        data["general"].update(encrypted_updates)
        self._write_yaml(data)
        return data["general"]

settings_service = SettingsFileService()

