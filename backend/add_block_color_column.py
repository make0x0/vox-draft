import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/vox")

def add_column():
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            print("Adding color column to transcription_blocks table...")
            conn.execute(text("ALTER TABLE transcription_blocks ADD COLUMN color VARCHAR NULL"))
            conn.commit()
            print("Successfully added color column.")
        except Exception as e:
            print(f"Error adding column: {e}")
            print("Column might already exist.")

if __name__ == "__main__":
    add_column()
