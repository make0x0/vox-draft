from openai import OpenAI
import os
from sqlalchemy.orm import Session
from app.models.transcription_block import TranscriptionBlock
from app.core.config import settings
from app.services.openai_factory import get_openai_client

def transcribe_audio_task(block_id: str, db: Session):
    print(f"Starting transcription for block {block_id}")
    
    try:
        # Check block existence
        block = db.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
        if not block:
            print(f"Block {block_id} not found in background task")
            return

        # Immediate feedback that task started
        block.text = "(Processing...)"
        db.commit()

        # Determine Provider (Prefer dynamic settings if available)
        # Determine Provider (Prefer dynamic settings if available)
        provider = settings.STT_PROVIDER
        stt_prompt = "" # Default empty prompt
        use_vocab = False
        
        try:
             from app.services.settings_file import settings_service
             user_settings = settings_service.get_general_settings()
             if user_settings.get("stt_provider"):
                 provider = user_settings.get("stt_provider")
             
             # Fetch Prompt Config
             prompts = user_settings.get("stt_prompts", {})
             stt_prompt = prompts.get(provider, "")
             use_vocab = user_settings.get("use_vocabulary_for_stt", False)
             
             # Append Vocabulary if enabled
             if use_vocab:
                 vocab_list = settings_service.get_vocabulary()
                 if vocab_list:
                     vocab_text = ", ".join([f"{v['word']}({v['reading']})" for v in vocab_list])
                     # Format depends on provider, but generally appending is safe for context
                     # For OpenAI/Azure, prompt is just context text.
                     # For Gemini, it's instruction.
                     
                     if provider == "gemini":
                         stt_prompt += f"\n\nPlease verify whether the following terms are included in the audio and transcribe them correctly using the specified readings:\n{vocab_text}"
                     else:
                         # OpenAI/Azure prompt is limited in length (224 tokens usually?) 
                         # Actually prompt is for "style and context". A list of words helps.
                         # We append it.
                         stt_prompt += f" {vocab_text}"

        except Exception as e:
             print(f"Error loading STT settings: {e}")

        if provider == "gemini":
            from app.services.gemini_service import gemini_service
            model_name = settings.STT_GEMINI_MODEL
            try:
                # Override model from user settings if present
                if user_settings.get("stt_gemini_model"):
                    model_name = user_settings.get("stt_gemini_model")
            except: pass

            print(f"Transcribing block {block_id} using Gemini ({model_name})...")
            block.text = "(Processing with Gemini...)"
            db.commit()

            try:
                # Use the configured prompt (or default if empty, but we set default in settings.yaml)
                # If settings.yaml gave us "", Gemini might need a base instruction?
                # The user default we set was "Transcribe..."
                # If user clears it, we might want a fallback?
                # Let's assume if stt_prompt is empty, we use a hardcoded fallback just in case.
                final_prompt = stt_prompt if stt_prompt.strip() else "Transcribe the following audio file verbatim."

                text = gemini_service.transcribe(block.file_path, model_name=model_name, prompt=final_prompt)
                block.text = text
                db.add(block)
                db.commit()
                print(f"Gemini Transcription finished for block {block_id}")
                return
            except Exception as e:
                block.text = f"[Error] Gemini Error: {str(e)}"
                db.add(block)
                db.commit()
                return

        # OpenAI / Azure Logic
        client = get_openai_client("stt")
        model_name = settings.STT_AZURE_DEPLOYMENT if settings.STT_PROVIDER == "azure" else "whisper-1"

        import time
        from openai import APIStatusError, APIConnectionError

        # Manual retry loop to provide status updates
        max_retries = settings.STT_MAX_RETRIES
        retry_delay = 1.0
        
        # Get base URL for display
        base_url = str(client.base_url)
        
        for attempt in range(max_retries + 1):
            try:
                # Check if file exists
                if not block.file_path or not os.path.exists(block.file_path):
                    raise FileNotFoundError(f"Audio file not found at {block.file_path}")

                # Update status for frontend (first attempt or retry)
                # We already set "Processing..." initially.
                # If we are retrying, we update.
                if attempt > 0:
                    block.text = f"(Retry {attempt}/{max_retries} to {base_url}...)"
                    db.commit()
                
                print(f"Transcribing file: {block.file_path} using model {model_name} (Attempt {attempt+1})")
                
                with open(block.file_path, "rb") as audio_file:
                    # Construct args
                    kwargs = {
                        "model": model_name,
                        "file": audio_file,
                        "response_format": "text"
                    }
                    if stt_prompt.strip():
                        kwargs["prompt"] = stt_prompt.strip()

                    transcription = client.audio.transcriptions.create(**kwargs)
                
                # Success
                block.text = transcription
                db.add(block)
                db.commit()
                print(f"Transcription finished for block {block_id}")
                return

            except APIConnectionError as e:
                print(f"Connection Failed (Attempt {attempt+1}): {e}")
                if attempt < max_retries:
                    block.text = f"(Connection Error: Retrying {attempt+1}/{max_retries} to {base_url}...)"
                    db.add(block)
                    db.commit()
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    block.text = f"[Error] Connection Failed: Could not connect to {base_url}."
                    db.add(block)
                    db.commit()
                    return # Exit after final failure

            except APIStatusError as e:
                print(f"API Call failed (Attempt {attempt+1}): {e}")
                error_code = e.status_code
                
                if attempt < max_retries:
                    block.text = f"(HTTP {error_code}: Retrying {attempt+1}/{max_retries} to {base_url}...)"
                    db.add(block)
                    db.commit()
                    time.sleep(retry_delay)
                    retry_delay *= 2 # Exponential backoff
                else:
                    block.text = f"[Error] HTTP {error_code}: {e.message}"
                    db.add(block)
                    db.commit()
                    return # Exit after final failure
                    
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
                    return # Exit after final failure

    except Exception as e:
        print(f"CRITICAL: Encoutered top-level error in transcription task: {e}")
        # Need to re-query block if session might be stale?
        # But we are in the same scope.
        try:
             # Ensure we have the block reference
             if 'block' in locals() and block:
                block.text = f"[Error] System Error: {str(e)}"
                db.add(block)
                db.commit()
        except:
             print("Failed to update block with error status")
