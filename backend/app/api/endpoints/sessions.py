from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import desc
import asyncio

from app.db.base import get_db
from app.models.session import Session as SessionModel
from app.models.transcription_block import TranscriptionBlock as BlockModel
from app.schemas import session as session_schema
from app.schemas import transcription_block as block_schema
from app.api.endpoints.websocket import broadcast_event

router = APIRouter()


async def run_broadcast(event_type: str, payload: dict = None):
    """Broadcast event to all WebSocket clients"""
    try:
        await broadcast_event(event_type, payload)
        print(f"[Broadcast] Sent: {event_type} - {payload}")
    except Exception as e:
        print(f"[Broadcast] Error: {e}")

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
            is_deleted=s.is_deleted,
            color=s.color,
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

from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.config import settings

@router.post("/", response_model=session_schema.Session)
async def create_session(session_in: session_schema.SessionCreate, db: DBSession = Depends(get_db)):
    tz = ZoneInfo(settings.TIMEZONE)
    today_str = datetime.now(tz).strftime("%Y-%m-%d %H:%M")
    default_title = f"{today_str} MEMO"
    db_session = SessionModel(
        title=session_in.title or default_title,
        summary=session_in.summary or ""
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    await run_broadcast("session_created", {"session_id": db_session.id})
    return db_session

@router.patch("/{session_id}", response_model=session_schema.Session)
async def update_session(session_id: str, session_in: session_schema.SessionUpdate, db: DBSession = Depends(get_db)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session_in.title is not None:
        db_session.title = session_in.title
    if session_in.summary is not None:
        db_session.summary = session_in.summary
    if session_in.color is not None:
        db_session.color = session_in.color
    
    db.commit()
    db.refresh(db_session)
    await run_broadcast("session_updated", {"session_id": session_id})
    return db_session

@router.delete("/{session_id}")
async def delete_session(session_id: str, db: DBSession = Depends(get_db)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
         raise HTTPException(status_code=404, detail="Session not found")
    
    db_session.is_deleted = True
    db.commit()
    await run_broadcast("session_deleted", {"session_id": session_id})
    return {"ok": True}

@router.post("/{session_id}/restore", response_model=session_schema.Session)
def restore_session(session_id: str, db: DBSession = Depends(get_db)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
         raise HTTPException(status_code=404, detail="Session not found")
    
    db_session.is_deleted = False
    db.commit()
    db.refresh(db_session)
    return db_session

@router.delete("/trash/empty")
def empty_session_trash(db: DBSession = Depends(get_db)):
    """
    Permanently delete all soft-deleted sessions and their files.
    """
    # Find all soft-deleted sessions
    deleted_sessions = db.query(SessionModel).filter(SessionModel.is_deleted == True).all()
    
    count = 0
    import os
    from pathlib import Path

    for session in deleted_sessions:
        # 1. Delete associated files (blocks)
        blocks = db.query(BlockModel).filter(BlockModel.session_id == session.id).all()
        for block in blocks:
             if block.file_path:
                try:
                    file_path = Path(block.file_path)
                    if file_path.exists() and file_path.is_file():
                        os.remove(file_path)
                        print(f"Deleted file: {file_path}")
                except Exception as e:
                    print(f"Error deleting file {block.file_path}: {e}")
        
        # 2. Delete session (cascade should handle blocks if configured, but let's be safe/explicit if needed, 
        # but model says cascade='all, delete-orphan' so ensuring session deletion is enough)
        # However, we must ensure blocks are deleted from DB. Cascade works if using ORM delete.
        db.delete(session)
        count += 1

    db.commit()
    return {"ok": True, "deleted_count": count}

# --- Block Operations ---

@router.post("/{session_id}/blocks", response_model=block_schema.TranscriptionBlock)
async def create_block(session_id: str, block_in: block_schema.TranscriptionBlockBase, db: DBSession = Depends(get_db)):
    # Check session exists
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    tz = ZoneInfo(settings.TIMEZONE)

    # Determine next order_index
    from sqlalchemy import func
    max_order = db.query(func.max(BlockModel.order_index)).filter(BlockModel.session_id == session_id).scalar()
    next_order = (max_order if max_order is not None else -1) + 1

    db_block = BlockModel(
        session_id=session_id,
        type=block_in.type,
        text=block_in.text,
        file_path=block_in.file_path,
        is_checked=block_in.is_checked,
        duration=block_in.duration,
        timestamp=datetime.now(tz).strftime("%H:%M:%S"),
        order_index=next_order
    )
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    await run_broadcast("block_created", {"session_id": session_id, "block_id": db_block.id})
    return db_block

@router.patch("/blocks/{block_id}", response_model=block_schema.TranscriptionBlock)
async def update_block(block_id: str, block_in: block_schema.TranscriptionBlockUpdate, db: DBSession = Depends(get_db)):
    db_block = db.query(BlockModel).filter(BlockModel.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    if block_in.text is not None:
        db_block.text = block_in.text
    if block_in.is_checked is not None:
        db_block.is_checked = block_in.is_checked
    if block_in.color is not None:
        db_block.color = block_in.color
        
    db.commit()
    db.refresh(db_block)
    await run_broadcast("block_updated", {"session_id": db_block.session_id, "block_id": block_id})
    return db_block

@router.post("/{session_id}/blocks/batch_update")
async def batch_update_blocks(session_id: str, bulk_in: block_schema.TranscriptionBlockBulkUpdate, db: DBSession = Depends(get_db)):
    """
    Bulk update blocks (e.g. check/uncheck all).
    """
    if not bulk_in.ids:
         return {"ok": True, "updated_count": 0}

    update_data = bulk_in.update.dict(exclude_unset=True)
    if not update_data:
        return {"ok": True, "updated_count": 0}
    
    count = 0
    # Standard query update or loop
    # For safety/hooks, loop might be better but slow. 
    # Bulk update is faster.
    db.query(BlockModel).filter(BlockModel.id.in_(bulk_in.ids), BlockModel.session_id == session_id).update(update_data, synchronize_session=False)
    db.commit()
    
    await run_broadcast("block_updated", {"session_id": session_id})
    return {"ok": True, "updated_count": len(bulk_in.ids)}

@router.post("/{session_id}/blocks/reorder")
async def reorder_blocks(
    session_id: str, 
    reorder: block_schema.TranscriptionBlockReorder, 
    db: DBSession = Depends(get_db)
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    for idx, block_id in enumerate(reorder.block_ids):
        db.query(BlockModel).filter(BlockModel.id == block_id, BlockModel.session_id == session_id).update({"order_index": idx})
        
    db.commit()
    await run_broadcast("block_updated", {"session_id": session_id})
    return {"ok": True}

@router.delete("/blocks/{block_id}")
def delete_block(block_id: str, db: DBSession = Depends(get_db)):
    """
    Soft delete a block (move to trash).
    """
    db_block = db.query(BlockModel).filter(BlockModel.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    # Soft Delete only
    db_block.is_deleted = True
    
    db.commit()
    return {"ok": True}

@router.post("/blocks/{block_id}/restore", response_model=block_schema.TranscriptionBlock)
def restore_block(block_id: str, db: DBSession = Depends(get_db)):
    db_block = db.query(BlockModel).filter(BlockModel.id == block_id).first()
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    db_block.is_deleted = False
    
    db.commit()
    db.refresh(db_block)
    return db_block

@router.delete("/{session_id}/trash")
def empty_trash(session_id: str, db: DBSession = Depends(get_db)):
    """
    Permanently delete all blocks in trash for this session.
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    deleted_blocks = db.query(BlockModel).filter(
        BlockModel.session_id == session_id,
        BlockModel.is_deleted == True
    ).all()
    
    if not deleted_blocks:
          return {"ok": True, "deleted_count": 0}

    import os
    from pathlib import Path
    
    count = 0
    for block in deleted_blocks:
        # Physical File Deletion
        if block.file_path:
            try:
                # Resolve relative paths if needed, assuming absolute for now as per previous code
                file_path = Path(block.file_path)
                if file_path.exists() and file_path.is_file():
                    os.remove(file_path)
                    print(f"Deleted block file: {file_path}")
            except Exception as e:
                print(f"Error deleting block file {block.file_path}: {e}")
        
        db.delete(block)
        count += 1
        
    db.commit()
    return {"ok": True, "deleted_count": count}
