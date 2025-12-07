from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import desc

from app.db.base import get_db
from app.models.session import Session as SessionModel
from app.models.transcription_block import TranscriptionBlock as BlockModel
from app.schemas import session as session_schema
from app.schemas import transcription_block as block_schema

router = APIRouter()

@router.get("/", response_model=List[session_schema.SessionList])
def list_sessions(skip: int = 0, limit: int = 100, db: DBSession = Depends(get_db)):
    """
    List all sessions with summary info.
    """
    sessions = db.query(SessionModel).order_by(desc(SessionModel.created_at)).offset(skip).limit(limit).all()
    
    # Manually populate first_block_text for preview if needed, or query it effectively.
    # For now, simplistic approach
    results = []
    for s in sessions:
        # Get first text block
        first_block = db.query(BlockModel).filter(BlockModel.session_id == s.id, BlockModel.type == "text").first()
        results.append(session_schema.SessionList(
            id=s.id,
            title=s.title,
            summary=s.summary,
            created_at=s.created_at,
            first_block_text=first_block.text if first_block else None
        ))
    return results

@router.get("/{session_id}", response_model=session_schema.Session)
def get_session(session_id: str, db: DBSession = Depends(get_db)):
    """
    Get generic session details and all blocks.
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Ensure blocks are loaded and ordered
    # blocks relationship should handle loading, but ordering might depend on definition.
    # If not ordered in relationship, we might need to sort here or use a separate query.
    # Assuming blocks are loaded.
    
    return session

from datetime import datetime, timedelta, timezone

# JST timezone
JST = timezone(timedelta(hours=9))

@router.post("/", response_model=session_schema.Session)
def create_session(session_in: session_schema.SessionCreate, db: DBSession = Depends(get_db)):
    default_title = f"Memo {datetime.now(JST).strftime('%Y/%m/%d %H:%M')}"
    db_session = SessionModel(
        title=session_in.title or default_title,
        summary=session_in.summary or ""
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.patch("/{session_id}", response_model=session_schema.Session)
def update_session(session_id: str, session_in: session_schema.SessionUpdate, db: DBSession = Depends(get_db)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session_in.title is not None:
        db_session.title = session_in.title
    if session_in.summary is not None:
        db_session.summary = session_in.summary
    
    db.commit()
    db.refresh(db_session)
    return db_session

@router.delete("/{session_id}")
def delete_session(session_id: str, db: DBSession = Depends(get_db)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
         raise HTTPException(status_code=404, detail="Session not found")
    
    # Cascade delete should be handled by DB or manually delete blocks
    # Assuming DB cascade or we delete manually
    db.query(BlockModel).filter(BlockModel.session_id == session_id).delete()
    db.delete(db_session)
    db.commit()
    return {"ok": True}

# --- Block Operations ---

@router.post("/{session_id}/blocks", response_model=block_schema.TranscriptionBlock)
def create_block(session_id: str, block_in: block_schema.TranscriptionBlockBase, db: DBSession = Depends(get_db)):
    # Check session exists
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db_block = BlockModel(
        session_id=session_id,
        type=block_in.type,
        text=block_in.text,
        file_path=block_in.file_path,
        is_checked=block_in.is_checked,
        duration=block_in.duration
    )
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block

@router.patch("/blocks/{block_id}", response_model=block_schema.TranscriptionBlock)
def update_block(block_id: str, block_in: block_schema.TranscriptionBlockUpdate, db: DBSession = Depends(get_db)):
    db_block = db.query(BlockModel).filter(BlockModel.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    if block_in.text is not None:
        db_block.text = block_in.text
    if block_in.is_checked is not None:
        db_block.is_checked = block_in.is_checked
        
    db.commit()
    db.refresh(db_block)
    return db_block

@router.delete("/blocks/{block_id}")
def delete_block(block_id: str, db: DBSession = Depends(get_db)):
    db_block = db.query(BlockModel).filter(BlockModel.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    db.delete(db_block)
    db.commit()
    return {"ok": True}
