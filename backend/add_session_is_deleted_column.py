
import os
import sqlalchemy
from sqlalchemy import create_engine, text

# Get database URL from environment variable, simpler than loading full app config
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/vox")

def add_column():
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            print("Adding is_deleted column to sessions table...")
            conn.execute(text("ALTER TABLE sessions ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("Successfully added is_deleted column.")
        except Exception as e:
            print(f"Error adding column: {e}")
            # It might already exist
            print("Column might already exist or other error.")

if __name__ == "__main__":
    add_column()
