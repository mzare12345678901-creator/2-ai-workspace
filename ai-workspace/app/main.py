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
        username = settings.ADMIN_USERNAME
        email = settings.ADMIN_EMAIL
        password = settings.ADMIN_PASSWORD

        existing = (
            db.query(User)
            .filter(User.username == username)
            .first()
        )

        if existing is None:
            if not email or not password:
                print(
                    "ADMIN NOT CREATED: "
                    "Set ADMIN_EMAIL and ADMIN_PASSWORD in Render."
                )
                return

            admin = User(
                username=username,
                email=email,
                hashed_password=hash_password(password),
                is_admin=True,
                is_active=True,
                tokens=99999,
                gaming_theme_unlocked=True,
                referral_code="admin" + secrets.token_hex(3),
            )

            db.add(admin)
            db.commit()
            print("Default admin created.")
            return

        # Keep the existing account and its data.
        existing.is_admin = True
        existing.is_active = True
        existing.gaming_theme_unlocked = True

        # Never replace the password with an empty value.
        if email:
            existing.email = email

        if password:
            existing.hashed_password = hash_password(password)

        if not existing.referral_code:
            existing.referral_code = "admin" + secrets.token_hex(3)

        db.commit()
        print("Default admin checked successfully.")

    except Exception:
        db.rollback()
        import logging
        logging.exception("Failed to initialize the default admin.")

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
