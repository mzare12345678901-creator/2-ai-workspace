import os, uuid, aiofiles
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import UploadedFile, User
from app.config import settings, UPLOAD_DIR
from app.auth import get_current_user

router = APIRouter(prefix="/api/files", tags=["files"])

ALLOWED = {".pdf",".docx",".doc",".txt",".md",".csv",".json",".zip",
           ".png",".jpg",".jpeg",".gif",".py",".js",".ts",".html",".css"}


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"فرمت {ext} پشتیبانی نمی‌شود")
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(400, f"حجم فایل بیش از {settings.MAX_UPLOAD_MB}MB است")
    stored = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
    async with aiofiles.open(stored, "wb") as f:
        await f.write(content)
    rec = UploadedFile(
        filename=file.filename,
        stored_path=str(stored),
        size=len(content),
        user_id=user.id,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "filename": rec.filename, "size": rec.size}


@router.get("/")
def list_files(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(UploadedFile).filter(UploadedFile.user_id == user.id)\
             .order_by(UploadedFile.created_at.desc()).all()