from fastapi import APIRouter, HTTPException
from typing import List
import uuid

from app.schemas.settings import VocabularyItem as VocabularyItemSchema, VocabularyItemCreate, VocabularyItemUpdate
from app.services.settings_file import settings_service

router = APIRouter()

@router.get("/", response_model=List[VocabularyItemSchema])
def read_vocabulary(skip: int = 0, limit: int = 100):
    items = settings_service.get_vocabulary()
    return items[skip : skip + limit]

@router.post("/", response_model=VocabularyItemSchema)
def create_vocabulary_item(item: VocabularyItemCreate):
    new_item = {
        "id": str(uuid.uuid4()),
        "reading": item.reading,
        "word": item.word
    }
    settings_service.add_vocabulary_item(new_item)
    return new_item

@router.put("/{item_id}", response_model=VocabularyItemSchema)
def update_vocabulary_item(item_id: str, item: VocabularyItemUpdate):
    updates = {}
    if item.reading is not None:
        updates["reading"] = item.reading
    if item.word is not None:
        updates["word"] = item.word
        
    updated = settings_service.update_vocabulary_item(item_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Vocabulary item not found")
    return updated

@router.delete("/{item_id}")
def delete_vocabulary_item(item_id: str):
    settings_service.delete_vocabulary_item(item_id)
    return {"ok": True}
