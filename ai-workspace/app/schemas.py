from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr


# ═══ Auth ═══
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    referral_code: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool = False
    is_active: bool = True
    theme: str = "dark"
    tokens: int = 0
    referral_code: str = ""
    gaming_theme_unlocked: bool = False
    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ThemeUpdate(BaseModel):
    theme: str


class AdminRequestIn(BaseModel):
    reason: str = ""


class AdminRequestOut(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    reason: str
    status: str
    created_at: datetime
    class Config:
        orm_mode = True


# ═══ Referral / Tokens ═══
class ReferralOut(BaseModel):
    id: int
    username: str
    tokens_awarded: int
    created_at: datetime
    class Config:
        orm_mode = True


class ReferralInfo(BaseModel):
    my_code: str
    total_referrals: int
    total_tokens_earned: int
    tokens_per_referral: int
    referrals: List[ReferralOut] = []
    share_link: str = ""


class PurchaseIn(BaseModel):
    item: str
    payment_ref: str = ""
    note: str = ""


class PurchaseOut(BaseModel):
    id: int
    user_id: int
    username: str = ""
    item: str
    price_toman: int
    status: str
    payment_ref: str = ""
    note: str = ""
    created_at: datetime
    class Config:
        orm_mode = True


class ThemeUnlockIn(BaseModel):
    method: str = "tokens"


# ═══ Chat ═══
class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    file_ids: List[int] = []
    stream: Optional[bool] = None


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    edited: bool = False
    bookmarked: bool = False
    created_at: datetime
    class Config:
        orm_mode = True


class MessageEdit(BaseModel):
    content: str


class ConversationOut(BaseModel):
    id: int
    title: str
    pinned: bool = False
    archived: bool = False
    favorite: bool = False
    tags: str = ""
    summary: str = ""
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        orm_mode = True


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None
    favorite: Optional[bool] = None
    tags: Optional[str] = None


# ═══ Memory ═══
class MemoryIn(BaseModel):
    key: str
    value: str
    category: str = "general"
    importance: int = 5


class MemoryOut(BaseModel):
    id: int
    key: str
    value: str
    category: str
    importance: int
    created_at: datetime
    class Config:
        orm_mode = True


# ═══ User Settings ═══
class UserSettingsOut(BaseModel):
    font_size: int = 14
    compact_mode: bool = False
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 2048
    system_prompt: str = ""
    voice_enabled: bool = True
    voice_lang: str = "fa-IR"
    voice_rate: float = 1.0
    voice_pitch: float = 1.0
    voice_name: str = ""
    context_messages: int = 20
    auto_summarize: bool = True
    streaming: bool = True
    notifications: bool = True
    show_agent_timeline: bool = True
    class Config:
        orm_mode = True


class UserSettingsIn(BaseModel):
    font_size: Optional[int] = None
    compact_mode: Optional[bool] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None
    voice_enabled: Optional[bool] = None
    voice_lang: Optional[str] = None
    voice_rate: Optional[float] = None
    voice_pitch: Optional[float] = None
    voice_name: Optional[str] = None
    context_messages: Optional[int] = None
    auto_summarize: Optional[bool] = None
    streaming: Optional[bool] = None
    notifications: Optional[bool] = None
    show_agent_timeline: Optional[bool] = None


# ═══ Admin Settings ═══
class AppSettingsOut(BaseModel):
    ai_api_key_masked: str = ""
    ai_base_url: str = ""
    ai_model: str = ""
    ai_temperature: float = 0.7
    ai_max_tokens: int = 2048
    ai_system_prompt: str = ""
    fallback_enabled: bool = False
    fallback_api_key_masked: str = ""
    fallback_base_url: str = ""
    fallback_model: str = ""
    maintenance_mode: bool = False
    maintenance_message: str = ""
    allow_registration: bool = True
    welcome_message: str = ""
    site_name: str = "AI Workspace"
    site_description: str = ""
    max_upload_mb: int = 25
    daily_message_limit: int = 100
    max_users: int = 0
    rate_limit_per_minute: int = 20
    require_email_verification: bool = False
    min_password_length: int = 6
    session_days: int = 7
    default_theme: str = "dark"
    default_model: str = "gpt-4o-mini"
    default_temperature: float = 0.7
    default_streaming: bool = True
    referral_enabled: bool = True
    referral_tokens: int = 10
    gaming_theme_price: int = 50000
    gaming_theme_token_price: int = 50
    class Config:
        orm_mode = True


class AppSettingsIn(BaseModel):
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None
    ai_model: Optional[str] = None
    ai_temperature: Optional[float] = None
    ai_max_tokens: Optional[int] = None
    ai_system_prompt: Optional[str] = None
    fallback_enabled: Optional[bool] = None
    fallback_api_key: Optional[str] = None
    fallback_base_url: Optional[str] = None
    fallback_model: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    maintenance_message: Optional[str] = None
    allow_registration: Optional[bool] = None
    welcome_message: Optional[str] = None
    site_name: Optional[str] = None
    site_description: Optional[str] = None
    max_upload_mb: Optional[int] = None
    daily_message_limit: Optional[int] = None
    max_users: Optional[int] = None
    rate_limit_per_minute: Optional[int] = None
    require_email_verification: Optional[bool] = None
    min_password_length: Optional[int] = None
    session_days: Optional[int] = None
    default_theme: Optional[str] = None
    default_model: Optional[str] = None
    default_temperature: Optional[float] = None
    default_streaming: Optional[bool] = None
    referral_enabled: Optional[bool] = None
    referral_tokens: Optional[int] = None
    gaming_theme_price: Optional[int] = None
    gaming_theme_token_price: Optional[int] = None


# ═══ Admin Panel ═══
class AdminUserOut(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    tokens: int = 0
    referral_code: str = ""
    gaming_theme_unlocked: bool = False
    conversation_count: int = 0
    message_count: int = 0
    file_count: int = 0
    class Config:
        orm_mode = True


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_conversations: int
    total_messages: int
    total_files: int
    pending_requests: int = 0
    pending_purchases: int = 0
    total_referrals: int = 0


class SettingsIn(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
