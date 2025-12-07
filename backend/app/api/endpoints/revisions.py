from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.base import get_db
from app.models.revision import EditorRevision
from app.models.session import Session as SessionModel

router = APIRouter()

class RevisionSchema(BaseModel):
    id: str
    session_id: str
    content: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

class RevisionCreate(BaseModel):
    content: str
    note: Optional[str] = None

@router.get("/sessions/{session_id}/revisions", response_model=List[RevisionSchema])
def get_session_revisions(session_id: str, db: Session = Depends(get_db)):
    revisions = db.query(EditorRevision).filter(EditorRevision.session_id == session_id).order_by(desc(EditorRevision.created_at)).all()
    return revisions

@router.post("/sessions/{session_id}/revisions", response_model=RevisionSchema)
def create_revision(session_id: str, revision: RevisionCreate, db: Session = Depends(get_db)):
    # Verify session exists
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    new_rev = EditorRevision(
        session_id=session_id,
        content=revision.content,
        note=revision.note
    )
    db.add(new_rev)
    db.commit()
    db.refresh(new_rev)
    return new_rev

@router.delete("/revisions/{revision_id}")
def delete_revision(revision_id: str, db: Session = Depends(get_db)):
    rev = db.query(EditorRevision).filter(EditorRevision.id == revision_id).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Revision not found")
    
    db.delete(rev)
    db.commit()
    return {"status": "success"}
