from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from .transcription_block import TranscriptionBlock

class SessionBase(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    color: Optional[str] = None

class Session(SessionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = False
    color: Optional[str] = None
    blocks: List[TranscriptionBlock] = []

    class Config:
        from_attributes = True

class SessionList(BaseModel):
    id: str
    title: Optional[str]
    summary: Optional[str]
    created_at: datetime
    is_deleted: bool = False
    color: Optional[str] = None
    first_block_text: Optional[str] = None # For listing preview

    class Config:
        from_attributes = True
