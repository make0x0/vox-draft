from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.base import get_db, SessionLocal
from app.models.transcription_block import TranscriptionBlock
from app.services.transcription import transcribe_audio_task
from app.api.endpoints.websocket import broadcast_event
import asyncio

router = APIRouter()

def run_background_transcription(block_id: str):
    # Create a fresh DB session for the background task
    db = SessionLocal()
    try:
        transcribe_audio_task(block_id, db)
    finally:
        db.close()
    
    # Broadcast completion (run in new event loop since we're in a thread)
    try:
        block = None
        with SessionLocal() as db2:
            block = db2.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
            if block:
                session_id = block.session_id
        if session_id:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(broadcast_event("block_updated", {"session_id": session_id, "block_id": block_id}))
            loop.close()
    except Exception as e:
        print(f"[Broadcast] Error after transcription: {e}")

@router.post("/transcribe/{block_id}")
async def transcribe_audio(
    block_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    block = db.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    session_id = block.session_id
    
    # Trigger background task
    background_tasks.add_task(run_background_transcription, block_id)
    
    # Update status immediately
    block.text = "(Transcription queued...)"
    db.commit()
    
    # Broadcast that block is now processing
    await broadcast_event("block_updated", {"session_id": session_id, "block_id": block_id})

    return {"status": "queued", "block_id": block_id}
