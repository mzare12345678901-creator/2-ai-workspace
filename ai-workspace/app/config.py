import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


class Settings:
    # AI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # App
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    SECRET_KEY: str = "a7f3k9x2m5p8q1w4e6r0t7y3u9i2o5p8s1d4f6g9h2j5k8l1"
    MAX_UPLOAD_MB: int = 25
    NGROK_AUTHTOKEN: str = os.getenv("NGROK_AUTHTOKEN", "")

    # ─── ادمین (مستقیم اینجا) ───
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "m.zare.12345678901@gmail.com"
    ADMIN_PASSWORD: str = "m0641370261"

    DB_URL: str = f"sqlite:///{BASE_DIR / 'app.db'}"


settings = Settings()