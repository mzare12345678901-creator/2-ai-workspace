from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import (
    User, Conversation, Message, UploadedFile,
    AdminRequest, Referral, Purchase, AppSettings
)
from app.schemas import (
    AdminUserOut, AdminStats, ConversationOut, MessageOut,
    AdminRequestOut, PurchaseOut
)
from app.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ═══════════════════════════════════════
# آمار
# ═══════════════════════════════════════
@router.get("/stats", response_model=AdminStats)
def get_stats(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return AdminStats(
        total_users=db.query(User).count(),
        active_users=db.query(User).filter(User.is_active == True).count(),
        total_conversations=db.query(Conversation).count(),
        total_messages=db.query(Message).count(),
        total_files=db.query(UploadedFile).count(),
        pending_requests=db.query(AdminRequest).filter(AdminRequest.status == "pending").count(),
        pending_purchases=db.query(Purchase).filter(Purchase.status == "pending").count(),
        total_referrals=db.query(Referral).count(),
    )


# ═══════════════════════════════════════
# لیست کاربران
# ═══════════════════════════════════════
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
            tokens=u.tokens or 0,
            referral_code=u.referral_code or "",
            gaming_theme_unlocked=u.gaming_theme_unlocked or False,
            conversation_count=conv_count,
            message_count=msg_count,
            file_count=file_count,
        ))
    return result


# ═══════════════════════════════════════
# درخواست‌های ادمین
# ═══════════════════════════════════════
@router.get("/requests", response_model=List[AdminRequestOut])
def list_admin_requests(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    reqs = db.query(AdminRequest).order_by(AdminRequest.created_at.desc()).all()
    result = []
    for r in reqs:
        u = db.query(User).get(r.user_id)
        if u:
            result.append(AdminRequestOut(
                id=r.id,
                user_id=r.user_id,
                username=u.username,
                email=u.email,
                reason=r.reason,
                status=r.status,
                created_at=r.created_at,
            ))
    return result


@router.post("/requests/{rid}/approve")
def approve_request(rid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    req = db.query(AdminRequest).get(rid)
    if not req:
        raise HTTPException(404, "درخواست یافت نشد")
    if req.status != "pending":
        raise HTTPException(400, "این درخواست قبلاً بررسی شده")
    user = db.query(User).get(req.user_id)
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")
    user.is_admin = True
    req.status = "approved"
    req.reviewed_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "message": f"{user.username} به ادمین ارتقا یافت"}


@router.post("/requests/{rid}/reject")
def reject_request(rid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    req = db.query(AdminRequest).get(rid)
    if not req:
        raise HTTPException(404, "درخواست یافت نشد")
    if req.status != "pending":
        raise HTTPException(400, "این درخواست قبلاً بررسی شده")
    req.status = "rejected"
    req.reviewed_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════
# گفتگوهای کاربر
# ═══════════════════════════════════════
@router.get("/users/{uid}/conversations", response_model=List[ConversationOut])
def user_conversations(uid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Conversation).filter(Conversation.user_id == uid)\
             .order_by(Conversation.created_at.desc()).all()


@router.get("/conversations/{cid}/messages", response_model=List[MessageOut])
def conversation_messages(cid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Message).filter(Message.conversation_id == cid).order_by(Message.id).all()


# ═══════════════════════════════════════
# مدیریت کاربران
# ═══════════════════════════════════════
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


# ═══════════════════════════════════════
# توکن‌ها
# ═══════════════════════════════════════
@router.post("/users/{uid}/tokens")
def set_user_tokens(uid: int, amount: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404, "کاربر یافت نشد")
    u.tokens = amount
    db.commit()
    return {"ok": True, "tokens": u.tokens}


@router.post("/users/{uid}/add-tokens")
def add_user_tokens(uid: int, amount: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404, "کاربر یافت نشد")
    u.tokens = (u.tokens or 0) + amount
    db.commit()
    return {"ok": True, "tokens": u.tokens}


# ═══════════════════════════════════════
# تم گیمینگ
# ═══════════════════════════════════════
@router.post("/users/{uid}/unlock-gaming")
def admin_unlock_gaming(uid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404, "کاربر یافت نشد")
    u.gaming_theme_unlocked = True
    db.commit()
    return {"ok": True}


@router.post("/users/{uid}/lock-gaming")
def admin_lock_gaming(uid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404, "کاربر یافت نشد")
    u.gaming_theme_unlocked = False
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════
# خریدها
# ═══════════════════════════════════════
@router.get("/purchases", response_model=List[PurchaseOut])
def list_purchases(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    items = db.query(Purchase).order_by(Purchase.created_at.desc()).all()
    result = []
    for p in items:
        u = db.query(User).get(p.user_id)
        result.append(PurchaseOut(
            id=p.id,
            user_id=p.user_id,
            username=u.username if u else "حذف‌شده",
            item=p.item,
            price_toman=p.price_toman,
            status=p.status,
            payment_ref=p.payment_ref or "",
            note=p.note or "",
            created_at=p.created_at,
        ))
    return result


@router.post("/purchases/{pid}/approve")
def approve_purchase(pid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    p = db.query(Purchase).get(pid)
    if not p:
        raise HTTPException(404, "خرید یافت نشد")
    if p.status != "pending":
        raise HTTPException(400, "قبلاً بررسی شده")

    user = db.query(User).get(p.user_id)
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")

    if p.item == "gaming_theme":
        user.gaming_theme_unlocked = True

    p.status = "approved"
    p.reviewed_at = datetime.utcnow()
    p.reviewed_by = admin.id
    db.commit()
    return {"ok": True, "message": f"{p.item} برای {user.username} فعال شد"}


@router.post("/purchases/{pid}/reject")
def reject_purchase(pid: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    p = db.query(Purchase).get(pid)
    if not p:
        raise HTTPException(404, "خرید یافت نشد")
    p.status = "rejected"
    p.reviewed_at = datetime.utcnow()
    p.reviewed_by = admin.id
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════
# دعوت‌ها
# ═══════════════════════════════════════
@router.get("/referrals")
def list_referrals(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    refs = db.query(Referral).order_by(Referral.created_at.desc()).all()
    result = []
    for r in refs:
        referrer = db.query(User).get(r.referrer_id)
        referred = db.query(User).get(r.referred_id)
        result.append({
            "id": r.id,
            "referrer": referrer.username if referrer else "?",
            "referred": referred.username if referred else "?",
            "tokens": r.tokens_awarded,
            "created_at": r.created_at.isoformat(),
        })
    return result
