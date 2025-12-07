import shutil
import os
import tarfile
import json
import uuid
import tempfile
import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Body, BackgroundTasks
from fastapi.responses import FileResponse
from datetime import datetime, date
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.base import get_db
from app.models.session import Session as SessionModel
from app.models.transcription_block import TranscriptionBlock

router = APIRouter()

DATA_DIR = "/data"
TEMP_BASE_DIR = "/tmp/vox_imports"

# --- Models ---

class ExportRequest(BaseModel):
    start_date: str # YYYY-MM-DD
    end_date: str   # YYYY-MM-DD
    include_text: bool = True
    include_audio: bool = False
    include_config: bool = False
    client_settings: Optional[Dict[str, Any]] = None # Front-end settings (templates, vocab, etc)

class ImportAnalyzeResponse(BaseModel):
    token: str # Token to identify this temporary extraction
    sessions: List[Dict[str, Any]] # { id, title, created_at, status: 'new'|'conflict', summary: str }
    has_settings: bool
    settings_preview: Optional[Dict[str, Any]] = None

class ImportExecuteRequest(BaseModel):
    token: str
    target_session_ids: List[str] # IDs to import
    overwrite: bool = False
    import_settings: bool = False

# --- Endpoints ---

@router.post("/export")
def export_data(req: ExportRequest, db: Session = Depends(get_db)):
    try:
        start = datetime.strptime(req.start_date, "%Y-%m-%d")
        end = datetime.strptime(req.end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # 1. Prepare Temp Directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_dir = tempfile.mkdtemp(prefix=f"vox_export_{timestamp}_")
    export_content_dir = os.path.join(temp_dir, "content")
    os.makedirs(export_content_dir, exist_ok=True)
    
    # 2. Fetch Sessions
    sessions = db.query(SessionModel).filter(
        and_(SessionModel.created_at >= start, SessionModel.created_at <= end)
    ).all()

    # 3. Export Sessions Data
    sessions_dir = os.path.join(export_content_dir, "sessions")
    os.makedirs(sessions_dir, exist_ok=True)
    
    audio_files_to_copy = []

    for sess in sessions:
        # Get blocks
        blocks = db.query(TranscriptionBlock).filter(TranscriptionBlock.session_id == sess.id).order_by(TranscriptionBlock.created_at).all()
        
        sess_data = {
            "session": {
                "id": sess.id,
                "title": sess.title,
                "summary": sess.summary,
                "created_at": sess.created_at.isoformat(),
                "updated_at": sess.updated_at.isoformat() if sess.updated_at else None
            },
            "blocks": []
        }
        
        for b in blocks:
            b_data = {
                "id": b.id,
                "type": b.type,
                "text": b.text,
                "file_path": b.file_path,
                "timestamp": b.timestamp,
                "duration": b.duration,
                "is_checked": b.is_checked,
                "created_at": b.created_at.isoformat()
            }
            sess_data["blocks"].append(b_data)
            
            # Queue audio copy
            if req.include_audio and b.file_path and os.path.exists(b.file_path):
                # We will copy audio files to an 'audio' folder in export
                audio_files_to_copy.append(b.file_path)

        # Write session JSON
        with open(os.path.join(sessions_dir, f"{sess.id}.json"), 'w', encoding='utf-8') as f:
            json.dump(sess_data, f, ensure_ascii=False, indent=2)

    # 4. Copy Audio Files
    if req.include_audio and audio_files_to_copy:
        audio_export_dir = os.path.join(export_content_dir, "audio")
        os.makedirs(audio_export_dir, exist_ok=True)
        for src_path in audio_files_to_copy:
            # We assume unique filenames or nested structure. 
            # In vox, file_path is absolute. We need to maintain relative structure or flatten.
            # Flattening is risky if duplicates. But UUIDs used?
            # Let's just use basename for simplicity, assume they are unique enough (uuid prefixed usually)
            basename = os.path.basename(src_path)
            dst_path = os.path.join(audio_export_dir, basename)
            if os.path.exists(src_path):
                shutil.copy2(src_path, dst_path)

    # 5. Export Settings
    if req.include_config and req.client_settings:
        with open(os.path.join(export_content_dir, "settings.json"), 'w', encoding='utf-8') as f:
            json.dump(req.client_settings, f, ensure_ascii=False, indent=2)

    # 6. Create Tarball
    start_str = start.strftime("%Y%m%d")
    end_str = end.strftime("%Y%m%d")
    
    flags = []
    if req.include_text: flags.append("txt")
    if req.include_audio: flags.append("aud")
    if req.include_config: flags.append("cfg")
    flag_str = "-".join(flags) if flags else "data"
    
    filename = f"vox_{flag_str}_{start_str}_{end_str}.tar.gz"
    tar_path = os.path.join(temp_dir, filename)
    
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(export_content_dir, arcname="backup") # root folder inside tar

    # Cleanup is complex with FileResponse (it needs the file). 
    logging.info(f"Exporting data: {filename}")
    
    # Return FileResponse with explicit headers to ensure browser sees the filename
    return FileResponse(
        tar_path, 
        filename=filename, 
        media_type="application/gzip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/import/analyze", response_model=ImportAnalyzeResponse)
async def analyze_import(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".tar.gz"):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .tar.gz file.")

    # Create extraction dir
    token = str(uuid.uuid4())
    extract_path = os.path.join(TEMP_BASE_DIR, token)
    os.makedirs(extract_path, exist_ok=True)
    
    try:
        # Save upload to temp
        temp_tar = os.path.join(extract_path, "upload.tar.gz")
        with open(temp_tar, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract
        with tarfile.open(temp_tar, "r:gz") as tar:
            tar.extractall(path=extract_path)
            
        # Analyze Contents
        # Structure expect: backup/sessions/*.json, backup/settings.json
        base_dir = os.path.join(extract_path, "backup")
        sessions_dir = os.path.join(base_dir, "sessions")
        settings_path = os.path.join(base_dir, "settings.json")
        
        detected_sessions = []
        
        if os.path.exists(sessions_dir):
            for f in os.listdir(sessions_dir):
                if f.endswith(".json"):
                    try:
                        with open(os.path.join(sessions_dir, f), 'r', encoding='utf-8') as jf:
                            data = json.load(jf)
                            sess_info = data.get("session", {})
                            sess_id = sess_info.get("id")
                            
                            if sess_id:
                                # Check DB
                                existing = db.query(SessionModel).filter(SessionModel.id == sess_id).first()
                                status = "conflict" if existing else "new"
                                
                                detected_sessions.append({
                                    "id": sess_id,
                                    "title": sess_info.get("title", "No Title"),
                                    "created_at": sess_info.get("created_at"),
                                    "summary": sess_info.get("summary", ""),
                                    "status": status
                                })
                    except Exception:
                        pass # Skip malformed files
        
        has_settings = os.path.exists(settings_path)
        settings_preview = None
        if has_settings:
            try:
                with open(settings_path, 'r', encoding='utf-8') as f:
                    settings_preview = json.load(f)
            except:
                has_settings = False

        return {
            "token": token,
            "sessions": detected_sessions,
            "has_settings": has_settings,
            "settings_preview": settings_preview
        }

    except Exception as e:
        shutil.rmtree(extract_path, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/import/execute")
def execute_import(req: ImportExecuteRequest, db: Session = Depends(get_db)):
    extract_path = os.path.join(TEMP_BASE_DIR, req.token)
    base_dir = os.path.join(extract_path, "backup")
    if not os.path.exists(base_dir):
        raise HTTPException(status_code=404, detail="Import session expired or not found.")

    try:
        # Import Sessions
        successful_ids = []
        
        sessions_dir = os.path.join(base_dir, "sessions")
        audio_dir = os.path.join(base_dir, "audio")
        
        if os.path.exists(sessions_dir):
            for target_id in req.target_session_ids:
                json_path = os.path.join(sessions_dir, f"{target_id}.json")
                if not os.path.exists(json_path):
                    continue
                    
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    s_data = data["session"]
                    blocks_data = data["blocks"]
                    
                    # Check existence
                    existing_session = db.query(SessionModel).filter(SessionModel.id == target_id).first()
                    
                    if existing_session and not req.overwrite:
                        continue # Skip if exists and no overwrite
                    
                    if existing_session:
                        # Clean up existing blocks first? 
                        # Or just update session fields and merge blocks? 
                        # Strategy: Delete existing blocks to avoid duplication, then re-insert. 
                        # Session record update.
                        existing_session.title = s_data.get("title")
                        existing_session.summary = s_data.get("summary")
                        existing_session.created_at = datetime.fromisoformat(s_data["created_at"])
                        
                        db.query(TranscriptionBlock).filter(TranscriptionBlock.session_id == target_id).delete()
                    else:
                        new_session = SessionModel(
                            id=target_id,
                            title=s_data.get("title"),
                            summary=s_data.get("summary"),
                            created_at=datetime.fromisoformat(s_data["created_at"])
                        )
                        db.add(new_session)
                        
                    # Insert Blocks
                    for b in blocks_data:
                        # Handle Audio File Restore
                        # The block.file_path in JSON is the original absolute path. 
                        # We should try to restore to that path if possible, OR map it to a new location.
                        # For now, let's restore to /data/uploads if we have the file.
                        
                        restored_path = b.get("file_path")
                        if restored_path and os.path.exists(audio_dir):
                            # Check if audio file exists in export package
                            basename = os.path.basename(restored_path)
                            src_audio = os.path.join(audio_dir, basename)
                            if os.path.exists(src_audio):
                                # If using original path, ensure dirs exist
                                # But original path might be anywhere. Ideally we use a standard dir.
                                # Let's respect the path if it starts with /data, otherwise move to /data/restored?
                                # Simple approach: Restore to original path if possible.
                                try:
                                    target_dir = os.path.dirname(restored_path)
                                    if not os.path.exists(target_dir):
                                        os.makedirs(target_dir, exist_ok=True)
                                    shutil.copy2(src_audio, restored_path)
                                except Exception as e:
                                    print(f"Failed to restore audio {basename}: {e}")
                                    restored_path = None # Mark as lost if fail
                        
                        new_block = TranscriptionBlock(
                            id=b.get("id", str(uuid.uuid4())),
                            session_id=target_id,
                            type=b.get("type"),
                            text=b.get("text"),
                            file_path=restored_path,
                            timestamp=b.get("timestamp"),
                            duration=b.get("duration"),
                            is_checked=b.get("is_checked", True),
                            created_at=datetime.fromisoformat(b["created_at"])
                        )
                        db.add(new_block)
                        
                    successful_ids.append(target_id)
        
        db.commit()
        return {"status": "success", "imported_count": len(successful_ids), "imported_ids": successful_ids}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import execution failed: {str(e)}")
    finally:
        # Cleanup
        shutil.rmtree(extract_path, ignore_errors=True)

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
            blocks = db.query(TranscriptionBlock).filter(TranscriptionBlock.session_id == session.id).all()
            for block in blocks:
                if block.file_path and os.path.exists(block.file_path):
                    try:
                        os.remove(block.file_path)
                    except OSError:
                        pass 
            
            db.delete(session)
            deleted_count += 1
            
        db.commit()
        return {"status": "success", "deleted_count": deleted_count, "message": f"Deleted {deleted_count} sessions."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Archive deletion failed: {str(e)}")
