from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.base import get_db
from app.models.settings import VocabularyItem
from app.schemas.settings import VocabularyItem as VocabularyItemSchema, VocabularyItemCreate, VocabularyItemUpdate

router = APIRouter()

@router.get("/", response_model=List[VocabularyItemSchema])
def read_vocabulary(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(VocabularyItem).offset(skip).limit(limit).all()
    return items

@router.post("/", response_model=VocabularyItemSchema)
def create_vocabulary_item(item: VocabularyItemCreate, db: Session = Depends(get_db)):
    db_item = VocabularyItem(reading=item.reading, word=item.word)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=VocabularyItemSchema)
def update_vocabulary_item(item_id: str, item: VocabularyItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(VocabularyItem).filter(VocabularyItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Vocabulary item not found")
    
    db_item.reading = item.reading
    db_item.word = item.word
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_vocabulary_item(item_id: str, db: Session = Depends(get_db)):
    db_item = db.query(VocabularyItem).filter(VocabularyItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Vocabulary item not found")
    
    db.delete(db_item)
    db.commit()
    return {"ok": True}
