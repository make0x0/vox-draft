from pydantic import BaseModel
from typing import Optional

class PromptTemplateBase(BaseModel):
    title: str
    content: str

class PromptTemplateCreate(PromptTemplateBase):
    pass

class PromptTemplateUpdate(PromptTemplateBase):
    pass

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
