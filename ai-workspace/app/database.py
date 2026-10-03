from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings
import threading

engine = create_engine(
    settings.DB_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

_schema_lock = threading.Lock()
_schema_ready = False


def fix_missing_columns():
    global _schema_ready

    if _schema_ready:
        return

    with _schema_lock:
        if _schema_ready:
            return

        from app import models  # noqa: F401

        Base.metadata.create_all(bind=engine)

        with engine.begin() as conn:
            inspector = inspect(conn)
            tables = inspector.get_table_names()

            if "users" in tables:

                user_columns = {
                    column["name"]
                    for column in inspector.get_columns("users")
                }

                user_migrations = {
                    "tokens": "INTEGER DEFAULT 0",
                    "referral_code": "VARCHAR(20)",
                    "referred_by_id": "INTEGER",
                    "gaming_theme_unlocked": "BOOLEAN DEFAULT 0",
                }

                for column_name, column_definition in user_migrations.items():

                    if column_name not in user_columns:

                        conn.execute(
                            text(
                                'ALTER TABLE users ADD COLUMN "{}" {}'.format(
                                    column_name,
                                    column_definition
                                )
                            )
                        )

                conn.execute(
                    text(
                        """
                        CREATE UNIQUE INDEX IF NOT EXISTS
                        ix_users_referral_code
                        ON users (referral_code)
                        """
                    )
                )

            if "app_settings" in tables:

                settings_columns = {
                    column["name"]
                    for column in inspector.get_columns("app_settings")
                }

                settings_migrations = {
                    "referral_enabled": "BOOLEAN DEFAULT 1",
                    "referral_tokens": "INTEGER DEFAULT 10",
                    "gaming_theme_price": "INTEGER DEFAULT 50000",
                    "gaming_theme_token_price": "INTEGER DEFAULT 50",
                }

                for column_name, column_definition in settings_migrations.items():

                    if column_name not in settings_columns:

                        conn.execute(
                            text(
                                'ALTER TABLE app_settings ADD COLUMN "{}" {}'.format(
                                    column_name,
                                    column_definition
                                )
                            )
                        )

        _schema_ready = True


def initialize_database():
    fix_missing_columns()


def get_db():

    initialize_database()

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()
