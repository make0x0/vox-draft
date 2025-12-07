import os
import shutil
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.session import Session as SessionModel
from app.models.transcription_block import TranscriptionBlock
from app.core.config import settings

router = APIRouter()

DATA_DIR = "/data"

@router.post("/upload")
def upload_audio_file(
    file: UploadFile = File(...),
    session_id: str = Form(None), 
    db: Session = Depends(get_db)
):
    tz = ZoneInfo(settings.TIMEZONE)
    
    # Ensure session exists or create new
    if not session_id:
        new_session = SessionModel(title=f"Memo {datetime.now(tz).strftime(settings.DATE_FORMAT)}")
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        session_id = new_session.id
    
    session_dir = os.path.join(DATA_DIR, session_id, "audio")
    os.makedirs(session_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    if not file_ext:
        file_ext = ".m4a" # default
    
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(session_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create TranscriptionBlock
    block = TranscriptionBlock(
        session_id=session_id,
        type="audio",
        file_path=file_path,
        text="(Transcription queued...)",
        timestamp=datetime.now(tz).strftime("%H:%M:%S")
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    
    return {"block_id": block.id, "session_id": session_id, "file_path": file_path}
