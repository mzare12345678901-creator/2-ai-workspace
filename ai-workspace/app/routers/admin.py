from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Conversation, Message, UploadedFile
from app.schemas import AdminUserOut, AdminStats, ConversationOut, MessageOut
from app.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return AdminStats(
        total_users=db.query(User).count(),
        active_users=db.query(User).filter(User.is_active == True).count(),
        total_conversations=db.query(Conversation).count(),
        total_messages=db.query(Message).count(),
        total_files=db.query(UploadedFile).count(),
    )


@router.get("/users", response_model=List[AdminUserOut])
def list_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        conv_count = db.query(Conversation).filter(Conversation.user_id == u.id).count()
        msg_count = db.query(Message).join(Conversation).filter(Conversation.user_id == u.id).count()
        file_count = db.query(UploadedFile).filter(UploadedFile.user_id == u.id).count()
        result.append(AdminUserOut(
            id=u.id,
            username=u.username,
            email=u.email,
            is_active=u.is_active,
            is_admin=u.is_admin,
            created_at=u.created_at,
            conversation_count=conv_count,
            message_count=msg_count,
            file_count=file_count,
        ))
    return result


@router.get("/users/{uid}/conversations", response_model=List[ConversationOut])
def user_conversations(uid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Conversation).filter(Conversation.user_id == uid)\
             .order_by(Conversation.created_at.desc()).all()


@router.get("/conversations/{cid}/messages", response_model=List[MessageOut])
def conversation_messages(cid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Message).filter(Message.conversation_id == cid).order_by(Message.id).all()


@router.post("/users/{uid}/toggle-active")
def toggle_active(uid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if uid == admin.id:
        raise HTTPException(400, "نمی‌توانی خودت را غیرفعال کنی")
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404, "کاربر یافت نشد")
    u.is_active = not u.is_active
    db.commit()
    return {"ok": True, "is_active": u.is_active}


@router.post("/users/{uid}/toggle-admin")
def toggle_admin(uid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if uid == admin.id:
        raise HTTPException(400, "نمی‌توانی نقش خودت را تغییر دهی")
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404, "کاربر یافت نشد")
    u.is_admin = not u.is_admin
    db.commit()
    return {"ok": True, "is_admin": u.is_admin}


@router.delete("/users/{uid}")
def delete_user(uid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if uid == admin.id:
        raise HTTPException(400, "نمی‌توانی خودت را حذف کنی")
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404, "کاربر یافت نشد")
    db.delete(u)
    db.commit()
    return {"ok": True}