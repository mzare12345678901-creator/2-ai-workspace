# fix_db.py
from sqlalchemy import create_engine, text
import os

# همان URL دیتابیس خودت را بگذار
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN tokens INTEGER DEFAULT 0"))
        conn.commit()
        print("✅ ستون tokens اضافه شد")
    except Exception as e:
        print(f"⚠️ خطا: {e}")
