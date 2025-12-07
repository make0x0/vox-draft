from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.base import get_db, SessionLocal
from app.models.transcription_block import TranscriptionBlock
from app.services.transcription import transcribe_audio_task

router = APIRouter()

def run_background_transcription(block_id: str):
    # Create a fresh DB session for the background task
    db = SessionLocal()
    try:
        transcribe_audio_task(block_id, db)
    finally:
        db.close()

@router.post("/transcribe/{block_id}")
async def transcribe_audio(
    block_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    block = db.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    # Trigger background task
    background_tasks.add_task(run_background_transcription, block_id)
    
    # Update status immediately
    block.text = "(Transcription queued...)"
    db.commit()

    return {"status": "queued", "block_id": block_id}
