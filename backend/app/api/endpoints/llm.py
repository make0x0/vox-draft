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
    # Determine Provider & Model
    provider = settings.LLM_PROVIDER
    model_to_use = request.model
    
    # Check dynamic settings
    try:
        from app.services.settings_file import settings_service
        user_settings = settings_service.get_general_settings()
        if user_settings.get("llm_provider"):
            provider = user_settings.get("llm_provider")
        
        # Override model if requested or defaulted
        if provider == "gemini":
            model_to_use = settings.LLM_GEMINI_MODEL
            if user_settings.get("llm_gemini_model"):
                model_to_use = user_settings.get("llm_gemini_model")
        elif provider == "azure":
            model_to_use = settings.LLM_AZURE_DEPLOYMENT
    except: pass

    # Gemini Logic
    if provider == "gemini":
        from app.services.gemini_service import gemini_service
        async def gemini_generator():
            try:
                yield f"data: {json.dumps({'type': 'status', 'message': '(Connecting to Gemini...)'})}\n\n"
                
                # Use thread pool for sync generator in async? or just iterate
                # StreamingResponse takes async generator or sync iterator.
                # Our service is sync generator.
                for chunk in gemini_service.stream_chat(request.messages, model_name=model_to_use):
                     yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Gemini Error: {str(e)}'})}\n\n"

        return StreamingResponse(gemini_generator(), media_type="text/event-stream")

    # OpenAI / Azure Logic
    client = get_openai_client("llm")
    
    # Prepare OpenAI stream
    import asyncio
    from openai import APIStatusError, APIConnectionError

    async def event_generator():
        target_messages = request.messages # Messages are already in request
        
        # Manual retry settings
        max_retries = settings.LLM_MAX_RETRIES
        retry_delay = 1.0
        base_url = str(client.base_url)

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
    # Determine Provider
    provider = settings.LLM_PROVIDER
    model_to_use = request.model
    
    # Dynamic settings check
    try:
        from app.services.settings_file import settings_service
        user_settings = settings_service.get_general_settings()
        if user_settings.get("llm_provider"):
            provider = user_settings.get("llm_provider")
        
        if provider == "gemini":
            model_to_use = settings.LLM_GEMINI_MODEL
            if user_settings.get("llm_gemini_model"):
                model_to_use = user_settings.get("llm_gemini_model")
        elif provider == "azure":
             model_to_use = settings.LLM_AZURE_DEPLOYMENT
    except: pass
    
    # Gemini Logic
    if provider == "gemini":
        from app.services.gemini_service import gemini_service
        try:
             # Title generation prompt construction
             sys_prompt = settings_service.get_system_prompt("title_summary") or "Generate a concise title."
             messages = [
                 {"role": "system", "content": sys_prompt},
                 {"role": "user", "content": f"Text: {request.text[:1000]}..."}
             ]
             title = gemini_service.complete_chat(messages, model_name=model_to_use)
             return {"title": title.strip()}
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

    client = get_openai_client("llm")
    
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
