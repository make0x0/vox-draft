import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/vox")

def add_column():
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            print("Adding order_index column to transcription_blocks table...")
            conn.execute(text("ALTER TABLE transcription_blocks ADD COLUMN order_index INTEGER DEFAULT 0"))
            conn.commit()
            print("Successfully added order_index column.")
        except Exception as e:
            print(f"Error adding column: {e}")
            print("Column might already exist.")

if __name__ == "__main__":
    add_column()
