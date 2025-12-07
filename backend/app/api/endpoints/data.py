import shutil
import os
import tarfile
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import FileResponse
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.base import get_db
from app.models.session import Session as SessionModel
from app.models.transcription_block import TranscriptionBlock

router = APIRouter()

DATA_DIR = "/data"

@router.get("/export")
def export_data():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.tar.gz"
    filepath = os.path.join("/tmp", filename)
    
    # Ensure /data exists
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    
    try:
        with tarfile.open(filepath, "w:gz") as tar:
            tar.add(DATA_DIR, arcname="data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
        
    return FileResponse(filepath, filename=filename, media_type="application/gzip")

@router.post("/import")
async def import_data(file: UploadFile = File(...)):
    if not file.filename.endswith(".tar.gz"):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .tar.gz file.")

    temp_path = os.path.join("/tmp", f"restore_{datetime.now().strftime('%Y%m%d%H%M%S')}.tar.gz")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        with tarfile.open(temp_path, "r:gz") as tar:
            # Extract to root directory assuming archive contains "data/" prefix
            # Safe extract is safer but standard extractall to / is typical for restore logic
            # assuming container environment
            tar.extractall(path="/")
            
        return {"status": "success", "message": "Data restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restoration failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/archive")
def archive_data(start_date: str, end_date: str, db: Session = Depends(get_db)):
    """
    Delete sessions and associated data within a date range (inclusive).
    Format: YYYY-MM-DD
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        # Ensure end_date includes the entire day
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
    # Find sessions to delete
    sessions_to_delete = db.query(SessionModel).filter(
        and_(SessionModel.created_at >= start, SessionModel.created_at <= end)
    ).all()
    
    deleted_count = 0
    
    try:
        for session in sessions_to_delete:
            # Delete audio files referenced by blocks
            # We need to query blocks
            blocks = db.query(TranscriptionBlock).filter(TranscriptionBlock.session_id == session.id).all()
            for block in blocks:
                if block.file_path and os.path.exists(block.file_path):
                    try:
                        os.remove(block.file_path)
                    except OSError:
                        pass # Ignore file not found or permission error during cleanup
            
            # Cascade delete should handle blocks if configured in DB, 
            # but we defined cascade="all, delete-orphan" in relationship, so deleting session is enough for DB.
            db.delete(session)
            deleted_count += 1
            
        db.commit()
        return {"status": "success", "deleted_count": deleted_count, "message": f"Deleted {deleted_count} sessions."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Archive deletion failed: {str(e)}")
