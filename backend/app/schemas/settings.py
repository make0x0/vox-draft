from pydantic import BaseModel
from typing import Optional

class PromptTemplateBase(BaseModel):
    title: str
    content: str
    is_system: bool = False

class PromptTemplateCreate(PromptTemplateBase):
    pass

class PromptTemplateUpdate(PromptTemplateBase):
    title: Optional[str] = None
    content: Optional[str] = None
    is_system: Optional[bool] = None

class PromptTemplate(PromptTemplateBase):
    id: str
    class Config:
        from_attributes = True

class VocabularyItemBase(BaseModel):
    reading: str
    word: str

class VocabularyItemCreate(VocabularyItemBase):
    pass

class VocabularyItemUpdate(VocabularyItemBase):
    pass

class VocabularyItem(VocabularyItemBase):
    id: str
    class Config:
        from_attributes = True
