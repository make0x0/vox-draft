import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class EditorRevision(Base):
    __tablename__ = "editor_revisions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), index=True)
    content = Column(Text, nullable=True) # Markdown content
    note = Column(String, nullable=True)  # Optional note (e.g., "Initial", "LLM Output")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("Session", back_populates="revisions")
