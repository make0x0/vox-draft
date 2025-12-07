from openai import OpenAI
import os
from sqlalchemy.orm import Session
from app.models.transcription_block import TranscriptionBlock
from app.core.config import settings
from app.services.openai_factory import get_openai_client

def transcribe_audio_task(block_id: str, db: Session):
    print(f"Starting transcription for block {block_id}")
    
    # Check block existence
    block = db.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
    if not block:
        print(f"Block {block_id} not found in background task")
        return

    client = get_openai_client("stt")
    model_name = settings.STT_AZURE_DEPLOYMENT if settings.STT_PROVIDER == "azure" else "whisper-1"

    import time
    from openai import APIStatusError

    # Manual retry loop to provide status updates
    max_retries = settings.STT_MAX_RETRIES
    retry_delay = 1.0
    
    # Get base URL for display
    base_url = client.base_url
    
    for attempt in range(max_retries + 1):
        try:
            # Check if file exists
            if not block.file_path or not os.path.exists(block.file_path):
                raise FileNotFoundError(f"Audio file not found at {block.file_path}")

            # Update status for frontend (first attempt or retry)
            if attempt > 0:
                block.text = f"(Retry {attempt}/{max_retries} to {base_url}...)"
                db.commit()
            
            print(f"Transcribing file: {block.file_path} using model {model_name} (Attempt {attempt+1})")
            
            with open(block.file_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    model=model_name, 
                    file=audio_file,
                    response_format="text", 
                    # Timeout is handled by client settings, but we wrap call to catch errors
                )
            
            # Success
            block.text = transcription
            db.add(block)
            db.commit()
            print(f"Transcription finished for block {block_id}")
            return

        except APIStatusError as e:
            print(f"API Call failed (Attempt {attempt+1}): {e}")
            error_code = e.status_code
            
            if attempt < max_retries:
                block.text = f"(Error {error_code}: Retrying {attempt+1}/{max_retries} to {base_url}...)"
                db.add(block)
                db.commit()
                time.sleep(retry_delay)
                retry_delay *= 2 # Exponential backoff
            else:
                block.text = f"[Error] {error_code}: {e.message}"
                db.add(block)
                db.commit()
                
        except Exception as e:
            print(f"Unexpected error (Attempt {attempt+1}): {e}")
            if attempt < max_retries:
                block.text = f"(Error: {str(e)}... Retrying {attempt+1}/{max_retries})"
                db.add(block)
                db.commit()
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                block.text = f"[Error] 認識に失敗しました: {str(e)}"
                db.add(block)
                db.commit()
