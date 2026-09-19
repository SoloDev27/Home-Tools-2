from app.db.session import engine
from app.db.base import Base
from sqlalchemy import text

def init_db():
    # Use SQLAlchemy to create tables based on models
    Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE maps ADD COLUMN IF NOT EXISTS image_location TEXT;"))
            conn.execute(text("ALTER TABLE maps ADD COLUMN IF NOT EXISTS image_lat DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE maps ADD COLUMN IF NOT EXISTS image_lng DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE maps ADD COLUMN IF NOT EXISTS image_zoom DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE property ADD COLUMN IF NOT EXISTS area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE;"))
    except Exception as e:
        print("Note on table alter (may already exist or SQLite):", e)
    print("Database models initialized via SQLAlchemy ORM.")