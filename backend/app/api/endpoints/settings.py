from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.settings_file import settings_service

router = APIRouter()

@router.get("/")
def get_settings():
    return settings_service.get_general_settings()

@router.patch("/")
def update_settings(settings: Dict[str, Any]):
    return settings_service.update_general_settings(settings)
