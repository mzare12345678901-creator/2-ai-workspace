# app/database.py
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Render ممکن است postgres:// بدهد که باید به postgresql:// تبدیل شود
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def fix_missing_columns():
    """
    ستون‌هایی که در مدل‌ها تعریف شده‌اند ولی در دیتابیس وجود ندارند را اضافه می‌کند.
    فقط برای ستون‌های ساده کار می‌کند (نه constraint/index).
    """
    # مهم: مدل‌ها باید import شده باشند تا در Base.metadata ثبت شوند
    from app import models  # noqa: F401

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                # جدول جدید است، create_all خودش می‌سازد
                continue

            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}

            for col in table.columns:
                if col.name in existing_cols:
                    continue

                col_type = col.type.compile(engine.dialect)
                sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type}'

                # مقدار پیش‌فرض اگر بود
                if col.default is not None and getattr(col.default, "arg", None) is not None:
                    default_val = col.default.arg
                    if isinstance(default_val, str):
                        sql += f" DEFAULT '{default_val}'"
                    elif isinstance(default_val, (int, float)):
                        sql += f" DEFAULT {default_val}"
                    elif isinstance(default_val, bool):
                        sql += f" DEFAULT {int(default_val)}"

                try:
                    conn.execute(text(sql))
                    print(f"✅ ستون اضافه شد: {table_name}.{col.name} ({col_type})")
                except Exception as e:
                    print(f"❌ خطا در {table_name}.{col.name}: {e}")
