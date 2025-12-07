from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class TranscriptionBlockBase(BaseModel):
    type: str # 'audio' or 'text'
    text: Optional[str] = None
    file_path: Optional[str] = None
    is_checked: bool = True
    duration: Optional[str] = None
    file_name: Optional[str] = None
    timestamp: Optional[str] = None # Added for JST display string

class TranscriptionBlockCreate(TranscriptionBlockBase):
    session_id: str

class TranscriptionBlockUpdate(BaseModel):
    text: Optional[str] = None
    is_checked: Optional[bool] = None

class TranscriptionBlock(TranscriptionBlockBase):
    id: str
    session_id: str
    created_at: datetime
    timestamp: Optional[str] = None


    class Config:
        from_attributes = True
