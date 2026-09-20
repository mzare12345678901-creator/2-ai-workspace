from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, AdminRequest
from app.schemas import (
    UserRegister, UserOut, Token,
    ThemeUpdate, AdminRequestIn, AdminRequestOut,
)
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "این نام کاربری قبلاً ثبت شده")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "این ایمیل قبلاً ثبت شده")

    is_first_user = db.query(User).count() == 0

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        is_admin=is_first_user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.from_orm(user))


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "نام کاربری یا رمز عبور اشتباه است")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "حساب شما غیرفعال است")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.from_orm(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/theme")
def update_theme(data: ThemeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.theme = data.theme
    db.commit()
    return {"ok": True, "theme": data.theme}


@router.post("/request-admin", response_model=AdminRequestOut)
def request_admin(data: AdminRequestIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.is_admin:
        raise HTTPException(400, "شما از قبل ادمین هستید")

    existing = db.query(AdminRequest).filter(
        AdminRequest.user_id == user.id,
        AdminRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(400, "شما قبلاً درخواست داده‌اید. منتظر تأیید باشید.")

    req = AdminRequest(user_id=user.id, reason=data.reason)
    db.add(req)
    db.commit()
    db.refresh(req)

    return AdminRequestOut(
        id=req.id,
        user_id=user.id,
        username=user.username,
        email=user.email,
        reason=req.reason,
        status=req.status,
        created_at=req.created_at,
    )


@router.get("/my-admin-request", response_model=Optional[AdminRequestOut])
def my_admin_request(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(AdminRequest).filter(
        AdminRequest.user_id == user.id
    ).order_by(AdminRequest.created_at.desc()).first()
    if not req:
        return None
    return AdminRequestOut(
        id=req.id,
        user_id=user.id,
        username=user.username,
        email=user.email,
        reason=req.reason,
        status=req.status,
        created_at=req.created_at,
    )