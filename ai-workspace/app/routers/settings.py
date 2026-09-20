from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserSettings, AppSettings
from app.schemas import UserSettingsOut, UserSettingsIn, AppSettingsOut, AppSettingsIn
from app.ai_gateway import ai_gateway
from app.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_or_create_app_settings(db: Session) -> AppSettings:
    s = db.query(AppSettings).first()
    if not s:
        s = AppSettings(id=1)
        db.add(s); db.commit(); db.refresh(s)
    return s


def mask_key(k: str) -> str:
    if not k:
        return ""
    if len(k) <= 12:
        return "•••"
    return k[:6] + "•" * 8 + k[-4:]


# ═══════════════════════════════════════
# تنظیمات کاربر
# ═══════════════════════════════════════
@router.get("/user", response_model=UserSettingsOut)
def get_user_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s); db.commit(); db.refresh(s)
    return s


@router.post("/user", response_model=UserSettingsOut)
def update_user_settings(
    data: UserSettingsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s); db.commit(); db.refresh(s)

    for k, v in data.dict(exclude_none=True).items():
        setattr(s, k, v)

    db.commit(); db.refresh(s)
    return s


# ═══════════════════════════════════════
# تنظیمات عمومی (بدون auth)
# ═══════════════════════════════════════
@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    s = get_or_create_app_settings(db)
    return {
        "site_name": s.site_name,
        "site_description": s.site_description,
        "welcome_message": s.welcome_message,
        "allow_registration": s.allow_registration,
        "maintenance_mode": s.maintenance_mode,
        "maintenance_message": s.maintenance_message,
    }


# ═══════════════════════════════════════
# تنظیمات ادمین
# ═══════════════════════════════════════
@router.get("/admin", response_model=AppSettingsOut)
def get_admin_settings(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    s = get_or_create_app_settings(db)
    return AppSettingsOut(
        ai_api_key_masked=mask_key(s.ai_api_key) or "تنظیم نشده",
        ai_base_url=s.ai_base_url,
        ai_model=s.ai_model,
        ai_temperature=s.ai_temperature,
        ai_max_tokens=s.ai_max_tokens,
        ai_system_prompt=s.ai_system_prompt,
        fallback_enabled=s.fallback_enabled,
        fallback_api_key_masked=mask_key(s.fallback_api_key),
        fallback_base_url=s.fallback_base_url,
        fallback_model=s.fallback_model,
        maintenance_mode=s.maintenance_mode,
        maintenance_message=s.maintenance_message,
        allow_registration=s.allow_registration,
        welcome_message=s.welcome_message,
        site_name=s.site_name,
        site_description=s.site_description,
        max_upload_mb=s.max_upload_mb,
        daily_message_limit=s.daily_message_limit,
        max_users=s.max_users,
        rate_limit_per_minute=s.rate_limit_per_minute,
        require_email_verification=s.require_email_verification,
        min_password_length=s.min_password_length,
        session_days=s.session_days,
        default_theme=s.default_theme,
        default_model=s.default_model,
        default_temperature=s.default_temperature,
        default_streaming=s.default_streaming,
    )


@router.post("/admin")
def update_admin_settings(
    data: AppSettingsIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    s = get_or_create_app_settings(db)

    updates = data.dict(exclude_none=True)

    # اگه api_key با • شروع شد، یعنی placeholder بوده → رد کن
    if "ai_api_key" in updates and updates["ai_api_key"].startswith("•"):
        del updates["ai_api_key"]
    if "ai_api_key" in updates and updates["ai_api_key"] == "":
        del updates["ai_api_key"]
    if "fallback_api_key" in updates and updates["fallback_api_key"].startswith("•"):
        del updates["fallback_api_key"]

    for k, v in updates.items():
        setattr(s, k, v)

    db.commit()

    # آپدیت Gateway با مقادیر جدید
    ai_gateway.api_key = s.ai_api_key
    ai_gateway.base_url = s.ai_base_url.rstrip("/")
    ai_gateway.model = s.ai_model

    return {"ok": True}


@router.post("/admin/test")
async def test_admin_api(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """تست اتصال به API"""
    s = get_or_create_app_settings(db)
    if not s.ai_api_key:
        return {"ok": False, "error": "کلید API تنظیم نشده"}

    try:
        # آپدیت موقت gateway
        old_key = ai_gateway.api_key
        old_url = ai_gateway.base_url
        old_model = ai_gateway.model

        ai_gateway.api_key = s.ai_api_key
        ai_gateway.base_url = s.ai_base_url.rstrip("/")
        ai_gateway.model = s.ai_model

        reply = await ai_gateway.chat([{"role": "user", "content": "فقط بگو: OK"}])

        # برگردون به حالت قبل
        ai_gateway.api_key = old_key
        ai_gateway.base_url = old_url
        ai_gateway.model = old_model

        if reply.startswith("❌") or reply.startswith("⚠️"):
            return {"ok": False, "error": reply}
        return {"ok": True, "reply": reply[:200]}
    except Exception as e:
        return {"ok": False, "error": str(e)}