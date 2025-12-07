from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.base import get_db
from app.models.settings import PromptTemplate
from app.schemas.settings import PromptTemplate as PromptTemplateSchema, PromptTemplateCreate, PromptTemplateUpdate

router = APIRouter()

@router.get("/", response_model=List[PromptTemplateSchema])
def read_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    templates = db.query(PromptTemplate).offset(skip).limit(limit).all()
    return templates

@router.post("/", response_model=PromptTemplateSchema)
def create_template(template: PromptTemplateCreate, db: Session = Depends(get_db)):
    db_template = PromptTemplate(title=template.title, content=template.content)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/{template_id}", response_model=PromptTemplateSchema)
def update_template(template_id: str, template: PromptTemplateUpdate, db: Session = Depends(get_db)):
    db_template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db_template.title = template.title
    db_template.content = template.content
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):
    db_template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(db_template)
    db.commit()
    return {"ok": True}
