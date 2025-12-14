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

class TestConnectionRequest(BaseModel):
    provider: str
    openai_api_key: Optional[str] = None
    azure_openai_api_key: Optional[str] = None
    azure_openai_endpoint: Optional[str] = None
    azure_openai_ad_token: Optional[str] = None
    # For Gemini
    gemini_api_key: Optional[str] = None

class PromptTemplate(PromptTemplateBase):
    id: str
    class Config:
        from_attributes = True

class VocabularyItemBase(BaseModel):
    reading: str
    word: str

class VocabularyItemCreate(VocabularyItemBase):
    pass

class VocabularyItemUpdate(BaseModel):
    reading: Optional[str] = None
    word: Optional[str] = None

class VocabularyItem(VocabularyItemBase):
    id: str
    class Config:
        from_attributes = True
