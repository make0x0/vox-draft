from openai import OpenAI
import os
from sqlalchemy.orm import Session
from app.models.transcription_block import TranscriptionBlock
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def transcribe_audio_task(block_id: str, db: Session):
    print(f"Starting transcription for block {block_id}")
    
    # Check block existence
    block = db.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
    if not block:
        print(f"Block {block_id} not found in background task")
        return

    try:
        # Check if file exists
        if not block.file_path or not os.path.exists(block.file_path):
            raise FileNotFoundError(f"Audio file not found at {block.file_path}")

        print(f"Transcribing file: {block.file_path}")
        
        with open(block.file_path, "rb") as audio_file:
             resp = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file
            )
        result = resp.text
        
        block.text = result
        db.add(block)
        db.commit()
        print(f"Transcription finished for block {block_id}")
        
    except Exception as e:
         print(f"API Call failed: {e}")
         block.text = f"[Error] 認識に失敗しました: {str(e)}"
         db.add(block)
         db.commit()
