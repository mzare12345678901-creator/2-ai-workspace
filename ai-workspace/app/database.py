from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings
import threading


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = settings.DB_URL


# ============================================================
# ENGINE
# ============================================================

# PostgreSQL / Neon
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1
    )

if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
    )

# SQLite - local development
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False
        }
    )


# ============================================================
# SESSION
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ============================================================
# BASE
# ============================================================

Base = declarative_base()


# ============================================================
# SCHEMA LOCK
# ============================================================

_schema_lock = threading.Lock()
_schema_ready = False


# ============================================================
# FIX / INITIALIZE DATABASE
# ============================================================

def fix_missing_columns():
    global _schema_ready

    if _schema_ready:
        return

    with _schema_lock:

        if _schema_ready:
            return

        # Load models
        from app import models  # noqa: F401

        # Create missing tables
        Base.metadata.create_all(bind=engine)

        # Inspect database
        with engine.begin() as conn:

            inspector = inspect(conn)
            tables = inspector.get_table_names()


            # ====================================================
            # USERS
            # ====================================================

            if "users" in tables:

                user_columns = {
                    column["name"]
                    for column in inspector.get_columns("users")
                }

                # SQLite/PostgreSQL compatible types
                user_migrations = {
                    "tokens": "INTEGER DEFAULT 0",
                    "referral_code": "VARCHAR(20)",
                    "referred_by_id": "INTEGER",
                    "gaming_theme_unlocked": "BOOLEAN DEFAULT FALSE",
                }

                for column_name, column_definition in user_migrations.items():

                    if column_name not in user_columns:

                        # PostgreSQL
                        if DATABASE_URL.startswith("postgresql"):

                            conn.execute(
                                text(
                                    'ALTER TABLE users '
                                    'ADD COLUMN "{}" {}'.format(
                                        column_name,
                                        column_definition
                                    )
                                )
                            )

                        # SQLite
                        else:

                            conn.execute(
                                text(
                                    'ALTER TABLE users '
                                    'ADD COLUMN "{}" {}'.format(
                                        column_name,
                                        column_definition
                                    )
                                )
                            )


                # Referral code unique index
                try:

                    conn.execute(
                        text(
                            """
                            CREATE UNIQUE INDEX IF NOT EXISTS
                            ix_users_referral_code
                            ON users (referral_code)
                            """
                        )
                    )

                except Exception:
                    pass


            # ====================================================
            # APP SETTINGS
            # ====================================================

            if "app_settings" in tables:

                settings_columns = {
                    column["name"]
                    for column in inspector.get_columns(
                        "app_settings"
                    )
                }

                settings_migrations = {
                    "referral_enabled": "BOOLEAN DEFAULT TRUE",
                    "referral_tokens": "INTEGER DEFAULT 10",
                    "gaming_theme_price": "INTEGER DEFAULT 50000",
                    "gaming_theme_token_price": "INTEGER DEFAULT 50",
                }

                for column_name, column_definition in settings_migrations.items():

                    if column_name not in settings_columns:

                        conn.execute(
                            text(
                                'ALTER TABLE app_settings '
                                'ADD COLUMN "{}" {}'.format(
                                    column_name,
                                    column_definition
                                )
                            )
                        )


        _schema_ready = True


# ============================================================
# INITIALIZE DATABASE
# ============================================================

def initialize_database():
    fix_missing_columns()


# ============================================================
# GET DATABASE SESSION
# ============================================================

def get_db():

    initialize_database()

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()
