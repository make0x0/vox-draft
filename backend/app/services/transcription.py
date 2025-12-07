import time
from sqlalchemy.orm import Session
from app.models.transcription_block import TranscriptionBlock
from app.core.config import settings

def transcribe_audio_task(block_id: str, db: Session):
    # This function is intended to be run in a background thread/process
    # Since Session is not thread-safe, we should ideally create a new session here, 
    # but for BackgroundTasks fastAPI reuses the dependency if not careful.
    # Pattern: Pass the ID and create a NEW session scope inside the task.
    
    # Mocking long running process
    print(f"Starting transcription for block {block_id}")
    time.sleep(5) 
    
    # Check block
    block = db.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
    if block:
        # Here we would call OpenAI Whisper API
        # response = openai.Audio.transcribe(...)
        # result = response["text"]
        result = "これはダミーの認識結果です。Whisper APIが実際には呼ばれていませんが、非同期処理の動作確認用です。"
        
        block.text = result
        db.add(block)
        db.commit()
        print(f"Transcription finished for block {block_id}")
    else:
        print(f"Block {block_id} not found in background task")
