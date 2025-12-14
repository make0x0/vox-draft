import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    color = Column(String, nullable=True, default=None)
    
    # Establish relationship
    # Use string reference "TranscriptionBlock" to avoid circular import if needed, 
    # but since they are in different modules, we might need simple string.
    # Actually, we can just use class name string if we ensure backend loads properly.
    # Or import? Circular imports are risky in models. String is safer.
    # back_populates matches the one in TranscriptionBlock
    # back_populates matches the one in TranscriptionBlock
    blocks = relationship("TranscriptionBlock", back_populates="session", cascade="all, delete-orphan", order_by="TranscriptionBlock.order_index, TranscriptionBlock.created_at")
    
    revisions = relationship("EditorRevision", back_populates="session", cascade="all, delete-orphan", order_by="desc(EditorRevision.created_at)")
