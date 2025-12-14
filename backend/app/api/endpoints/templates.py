from fastapi import APIRouter, HTTPException
from typing import List
import uuid

from app.schemas.settings import PromptTemplate as PromptTemplateSchema, PromptTemplateCreate, PromptTemplateUpdate
from app.services.settings_file import settings_service

router = APIRouter()

@router.get("/", response_model=List[PromptTemplateSchema])
def read_templates(skip: int = 0, limit: int = 100):
    templates = settings_service.get_templates()
    # Simple pagination
    return templates[skip : skip + limit]

@router.post("/", response_model=PromptTemplateSchema)
def create_template(template: PromptTemplateCreate):
    new_template = {
        "id": str(uuid.uuid4()),
        "title": template.title,
        "content": template.content,
        "is_system": template.is_system if template.is_system is not None else False
    }
    settings_service.add_template(new_template)
    return new_template

@router.put("/{template_id}", response_model=PromptTemplateSchema)
def update_template(template_id: str, template: PromptTemplateUpdate):
    updates = {}
    if template.title is not None:
        updates["title"] = template.title
    if template.content is not None:
        updates["content"] = template.content
    if template.is_system is not None:
        updates["is_system"] = template.is_system
    
    updated = settings_service.update_template(template_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated

@router.delete("/{template_id}")
def delete_template(template_id: str):
    # Check if system template
    templates = settings_service.get_templates()
    target = next((t for t in templates if t.get("id") == template_id), None)
    if target and target.get("is_system"):
       raise HTTPException(status_code=400, detail="Cannot delete system template")
       
    settings_service.delete_template(template_id)
    return {"ok": True}
