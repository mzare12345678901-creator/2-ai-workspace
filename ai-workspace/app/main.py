# app/main.py
from contextlib import asynccontextmanager
from pathlib import Path
import secrets

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import Base, engine, SessionLocal, fix_missing_columns
from app import models  # noqa: F401 - مهم: قبل از create_all باید import شود
from app.models import User
from app.auth import hash_password
from app.config import settings
from app.routers import (
    chat, files, settings as settings_router,
    auth, admin, memory, referral
)


def create_default_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if existing:
            existing.is_admin = True
            existing.is_active = True
            existing.email = settings.ADMIN_EMAIL
            existing.hashed_password = hash_password(settings.ADMIN_PASSWORD)
            existing.gaming_theme_unlocked = True
            if not existing.referral_code:
                existing.referral_code = "admin" + secrets.token_hex(3)
            db.commit()
            print(f"✅ ادمین '{settings.ADMIN_USERNAME}' به‌روز شد.")
        else:
            db.add(User(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                is_admin=True,
                is_active=True,
                tokens=99999,
                gaming_theme_unlocked=True,
                referral_code="admin" + secrets.token_hex(3),
            ))
            db.commit()
            print(f"✅ ادمین '{settings.ADMIN_USERNAME}' ساخته شد.")
    except Exception as e:
        print(f"⚠️ خطا در ساخت ادمین: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ۱. ساخت جداول جدید (اگر وجود نداشته باشند)
    Base.metadata.create_all(bind=engine)

    # ۲. اضافه کردن ستون‌های گمشده به جداول موجود
    fix_missing_columns()

    # ۳. ساخت/به‌روزرسانی ادمین پیش‌فرض
    create_default_admin()

    yield

    # cleanup اگر لازم داشتی اینجا بنویس


app = FastAPI(title="AI Workspace", lifespan=lifespan)

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(files.router)
app.include_router(settings_router.router)
app.include_router(admin.router)
app.include_router(memory.router)
app.include_router(referral.router)


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/admin")
def admin_page():
    return FileResponse(STATIC_DIR / "admin.html")


@app.get("/health")
def health():
    return {"status": "ok"}
