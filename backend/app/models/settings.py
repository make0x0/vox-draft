import uuid
from sqlalchemy import Column, String, Text
from app.db.base import Base

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)

class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    reading = Column(String, index=True, nullable=False)
    word = Column(String, nullable=False)
