
import os
from sqlalchemy import create_engine, text

def migrate():
    # Get DB URL from env or use default
    db_url = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/vox")
    print(f"Connecting to database...")

    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn = conn.execution_options(isolation_level="AUTOCOMMIT")
            
            # Check if column exists
            print("Checking if column exists...")
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='transcription_blocks' AND column_name='is_deleted';"))
            if result.fetchone():
                print("Column 'is_deleted' already exists.")
            else:
                print("Adding 'is_deleted' column...")
                conn.execute(text("ALTER TABLE transcription_blocks ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;"))
                print("Column added successfully.")
                
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
