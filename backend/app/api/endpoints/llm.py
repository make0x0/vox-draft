import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from app.core.config import settings
from app.services.openai_factory import get_openai_client
from app.services.settings_file import settings_service

router = APIRouter()

class ChatRequest(BaseModel):
    messages: list
    model: str = "gpt-4o"
    temperature: float = 0.7

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    client = get_openai_client("llm")
    
    # Determine model/deployment
    if settings.LLM_PROVIDER == "azure":
        model_to_use = settings.LLM_AZURE_DEPLOYMENT
    else:
        model_to_use = request.model

    # Prepare OpenAI stream
    import asyncio
    from openai import APIStatusError, APIConnectionError

    async def event_generator():
        target_messages = request.messages # Messages are already in request
        
        # Manual retry settings
        max_retries = settings.LLM_MAX_RETRIES
        retry_delay = 1.0
        base_url = client.base_url

        for attempt in range(max_retries + 1):
            try:
                # Notify frontend of start/retry
                if attempt == 0:
                    yield f"data: {json.dumps({'type': 'status', 'message': f'(Connecting to {base_url}...)'})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'status', 'message': f'(Retry {attempt}/{max_retries} to {base_url}...)'})}\n\n"

                stream = client.chat.completions.create(
                    model=model_to_use,
                    messages=target_messages,
                    temperature=request.temperature,
                    stream=True,
                    # timeout handled by client strict settings but wrapped here
                )
                
                # If successful, yield chunks
                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content is not None:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'content': content})}\n\n"
                
                yield "data: [DONE]\n\n"
                return # Success, exit loop

            except APIConnectionError as e:
                print(f"LLM Connection Error (Attempt {attempt+1}): {e}")
                if attempt < max_retries:
                    yield f"data: {json.dumps({'type': 'status', 'message': f'(Connection Error: Retrying {attempt+1}/{max_retries}...)'})}\n\n"
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    yield f"data: {json.dumps({'type': 'error', 'message': f'Connection Failed: Could not connect to {base_url}'})}\n\n"
                    return

            except APIStatusError as e:
                error_code = e.status_code
                if attempt < max_retries:
                    yield f"data: {json.dumps({'type': 'status', 'message': f'(HTTP {error_code}: Retrying {attempt+1}/{max_retries}...)'})}\n\n"
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    # Final error
                    yield f"data: {json.dumps({'type': 'error', 'message': f'HTTP {error_code}: {e.message}'})}\n\n"
                    return
            except Exception as e:
                 if attempt < max_retries:
                    yield f"data: {json.dumps({'type': 'status', 'message': f'(Error: {str(e)}... Retrying {attempt+1}/{max_retries})'})}\n\n"
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                 else:
                    yield f"data: {json.dumps({'type': 'error', 'message': f'Error: {str(e)}'})}\n\n"
                    return

    return StreamingResponse(event_generator(), media_type="text/event-stream")

class TitleGenerationRequest(BaseModel):
    text: str
    model: str = "gpt-4o"

@router.post("/generate_title")
async def generate_title(request: TitleGenerationRequest):
    client = get_openai_client("llm")
    
    if settings.LLM_PROVIDER == "azure":
        model_to_use = settings.LLM_AZURE_DEPLOYMENT
    else:
        model_to_use = request.model

    try:
        completion = client.chat.completions.create(
            model=model_to_use,
            messages=[
                {"role": "system", "content": settings_service.get_system_prompt("title_summary") or "You are a helpful assistant. Generate a concise title (max 20 characters) for the given text. The title should be in Japanese and summarize the main topic. do not include quotation marks."},
                {"role": "user", "content": f"Text: {request.text[:1000]}..."} # Limit input length
            ],
            temperature=0.5,
            max_tokens=60,
        )
        title = completion.choices[0].message.content.strip()
        return {"title": title}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
