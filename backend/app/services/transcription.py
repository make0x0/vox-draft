import time
import random
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.transcription_block import TranscriptionBlock
from app.core.config import settings

def transcribe_audio_task(block_id: str, db: Session):
    print(f"Starting transcription for block {block_id}")
    
    # Check block existence
    block = db.query(TranscriptionBlock).filter(TranscriptionBlock.id == block_id).first()
    if not block:
        print(f"Block {block_id} not found in background task")
        return

    try:
        # Simulation removed as requested
        # process_duration = random.randint(3, 10)
        # time.sleep(process_duration)

        # Mocking occasional error removed
        # if random.random() < 0.1: ...

        # Success Result
        result = "これはダミーの認識結果です。タイムアウトもエラー処理も正常に機能しています。"
        
        block.text = result
        db.add(block)
        db.commit()
        print(f"Transcription finished for block {block_id}")

    except Exception as e:
        print(f"Transcription failed for block {block_id}: {e}")
        db.rollback() 
        # Re-query block to ensure clean state or just use current if valid?
        # Better safe:
        block.text = f"[Error] 認識に失敗しました: {str(e)}"
        db.add(block)
        db.commit()
