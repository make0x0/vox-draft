import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.db.base import Base

class TranscriptionBlock(Base):
    __tablename__ = "transcription_blocks"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), index=True)
    type = Column(String, default="audio")  # audio or text
    text = Column(Text, nullable=True) # Text content
    file_path = Column(String, nullable=True) # Path to audio file
    timestamp = Column(String, nullable=True) # Display timestamp
    duration = Column(String, nullable=True)
    is_checked = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Establish relationship if needed, for cascading deletes etc.
    # Establish relationship if needed, for cascading deletes etc.
    session = relationship("Session", back_populates="blocks")
