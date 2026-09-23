from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Referral, AppSettings, Purchase
from app.schemas import ReferralInfo, ReferralOut, PurchaseIn, PurchaseOut, ThemeUnlockIn
from app.auth import get_current_user, get_current_admin
from datetime import datetime

router = APIRouter(prefix="/api/referral", tags=["referral"])


def get_app_settings(db: Session) -> AppSettings:
    s = db.query(AppSettings).first()
    if not s:
        s = AppSettings(id=1)
        db.add(s); db.commit(); db.refresh(s)
    return s


@router.get("/info", response_model=ReferralInfo)
def get_referral_info(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    refs = db.query(Referral).filter(Referral.referrer_id == user.id)\
             .order_by(Referral.created_at.desc()).all()

    result = []
    for r in refs:
        u = db.query(User).get(r.referred_id)
        result.append(ReferralOut(
            id=r.id,
            username=u.username if u else "کاربر حذف‌شده",
            tokens_awarded=r.tokens_awarded,
            created_at=r.created_at,
        ))

    s = get_app_settings(db)

    return ReferralInfo(
        my_code=user.referral_code or "",
        total_referrals=len(refs),
        total_tokens_earned=sum(r.tokens_awarded for r in refs),
        tokens_per_referral=s.referral_tokens,
        referrals=result,
        share_link=f"/register?ref={user.referral_code or ''}",
    )


@router.post("/unlock-gaming-theme")
def unlock_gaming_theme(
    data: ThemeUnlockIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.gaming_theme_unlocked:
        raise HTTPException(400, "شما از قبل تم گیمینگ رو دارید")

    s = get_app_settings(db)

    if data.method == "tokens":
        needed = s.gaming_theme_token_price
        if user.tokens < needed:
            raise HTTPException(
                400,
                f"توکن کافی نداری. نیاز: {needed} توکن، موجودی: {user.tokens}"
            )
        user.tokens -= needed
        user.gaming_theme_unlocked = True
        db.commit()
        return {"ok": True, "message": "تم گیمینگ با توکن فعال شد!", "remaining_tokens": user.tokens}

    elif data.method == "payment":
        price = s.gaming_theme_price
        purchase = Purchase(
            user_id=user.id,
            item="gaming_theme",
            price_toman=price,
            status="pending",
        )
        db.add(purchase); db.commit()
        return {
            "ok": True,
            "message": "درخواست پرداخت ثبت شد. پس از تأیید ادمین، تم فعال می‌شه.",
            "price": price,
        }

    raise HTTPException(400, "روش نامعتبر")


@router.post("/purchase", response_model=PurchaseOut)
def create_purchase(
    data: PurchaseIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = get_app_settings(db)
    price = s.gaming_theme_price if data.item == "gaming_theme" else 0

    p = Purchase(
        user_id=user.id,
        item=data.item,
        price_toman=price,
        payment_ref=data.payment_ref,
        note=data.note,
        status="pending",
    )
    db.add(p); db.commit(); db.refresh(p)

    return PurchaseOut(
        id=p.id, user_id=user.id, username=user.username,
        item=p.item, price_toman=p.price_toman, status=p.status,
        payment_ref=p.payment_ref, note=p.note, created_at=p.created_at,
    )


@router.get("/my-purchases")
def my_purchases(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Purchase).filter(Purchase.user_id == user.id)\
              .order_by(Purchase.created_at.desc()).all()
    return [{
        "id": p.id, "item": p.item, "price": p.price_toman,
        "status": p.status, "note": p.note, "created_at": p.created_at,
    } for p in items]
