import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from app.core.config import settings

router = APIRouter()

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class ChatRequest(BaseModel):
    messages: list
    model: str = "gpt-4o"
    temperature: float = 0.7

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    # Prepare OpenAI stream
    try:
        stream = client.chat.completions.create(
            model=request.model,
            messages=request.messages,
            temperature=request.temperature,
            stream=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    def event_generator():
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                yield f"data: {json.dumps({'content': content})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
