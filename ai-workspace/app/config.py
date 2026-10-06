import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


class Settings:

    # ============================================================
    # AI
    # ============================================================

    OPENAI_API_KEY: str = os.getenv(
        "OPENAI_API_KEY",
        ""
    )

    OPENAI_BASE_URL: str = os.getenv(
        "OPENAI_BASE_URL",
        "https://api.openai.com/v1"
    )

    OPENAI_MODEL: str = os.getenv(
        "OPENAI_MODEL",
        "gpt-4o-mini"
    )


    # ============================================================
    # APP
    # ============================================================

    APP_HOST: str = "0.0.0.0"

    APP_PORT: int = int(
        os.getenv("PORT", "8000")
    )

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "change-this-secret-key"
    )

    MAX_UPLOAD_MB: int = int(
        os.getenv("MAX_UPLOAD_MB", "25")
    )

    NGROK_AUTHTOKEN: str = os.getenv(
        "NGROK_AUTHTOKEN",
        ""
    )


    # ============================================================
    # ADMIN
    # ============================================================

    ADMIN_USERNAME: str = os.getenv(
        "ADMIN_USERNAME",
        "admin"
    )

    ADMIN_EMAIL: str = os.getenv(
        "ADMIN_EMAIL",
        ""
    )

    ADMIN_PASSWORD: str = os.getenv(
        "ADMIN_PASSWORD",
        ""
    )


    # ============================================================
    # DATABASE
    # ============================================================

    # Render + Neon PostgreSQL:
    # DATABASE_URL باید در Environment رندر قرار بگیرد.
    #
    # Local:
    # اگر DATABASE_URL وجود نداشته باشد،
    # به صورت خودکار از SQLite استفاده می‌شود.

    DB_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'app.db'}"
    )


settings = Settings()
