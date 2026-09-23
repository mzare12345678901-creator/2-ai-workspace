from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from app.database import Base


# ═══════════════════════════════════════════════════════════════
# User
# ═══════════════════════════════════════════════════════════════
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    theme = Column(String(30), default="dark")

    # ─── سیستم دعوت و توکن ───
    tokens = Column(Integer, default=0)
    referral_code = Column(String(20), unique=True, index=True, nullable=True)
    referred_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    gaming_theme_unlocked = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    settings = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    memories = relationship(
        "Memory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sent_referrals = relationship(
        "Referral",
        foreign_keys="Referral.referrer_id",
        back_populates="referrer",
        cascade="all, delete-orphan",
    )
    received_referral = relationship(
        "Referral",
        foreign_keys="Referral.referred_id",
        back_populates="referred",
        uselist=False,
    )


# ═══════════════════════════════════════════════════════════════
# Referral (دعوت دوستان)
# ═══════════════════════════════════════════════════════════════
class Referral(Base):
    __tablename__ = "referrals"
    id = Column(Integer, primary_key=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    referred_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    tokens_awarded = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)

    referrer = relationship(
        "User",
        foreign_keys=[referrer_id],
        back_populates="sent_referrals",
    )
    referred = relationship(
        "User",
        foreign_keys=[referred_id],
        back_populates="received_referral",
    )


# ═══════════════════════════════════════════════════════════════
# Purchase (خریدها - مثل تم گیمینگ)
# ═══════════════════════════════════════════════════════════════
class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item = Column(String(50), nullable=False)
    price_toman = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    payment_ref = Column(String(100), default="")
    note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)


# ═══════════════════════════════════════════════════════════════
# UserSettings
# ═══════════════════════════════════════════════════════════════
class UserSettings(Base):
    __tablename__ = "user_settings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    font_size = Column(Integer, default=14)
    compact_mode = Column(Boolean, default=False)

    provider = Column(String(30), default="openai")
    model = Column(String(80), default="gpt-4o-mini")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2048)
    system_prompt = Column(Text, default="")

    voice_enabled = Column(Boolean, default=True)
    voice_lang = Column(String(10), default="fa-IR")
    voice_rate = Column(Float, default=1.0)
    voice_pitch = Column(Float, default=1.0)
    voice_name = Column(String(100), default="")

    context_messages = Column(Integer, default=20)
    auto_summarize = Column(Boolean, default=True)

    streaming = Column(Boolean, default=True)
    notifications = Column(Boolean, default=True)
    show_agent_timeline = Column(Boolean, default=True)

    user = relationship("User", back_populates="settings")


# ═══════════════════════════════════════════════════════════════
# AppSettings (تنظیمات سراسری)
# ═══════════════════════════════════════════════════════════════
class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True)

    # AI
    ai_api_key = Column(String(255), default="")
    ai_base_url = Column(String(255), default="https://api.openai.com/v1")
    ai_model = Column(String(80), default="gpt-4o-mini")
    ai_temperature = Column(Float, default=0.7)
    ai_max_tokens = Column(Integer, default=2048)
    ai_system_prompt = Column(Text, default="")

    # Fallback
    fallback_enabled = Column(Boolean, default=False)
    fallback_api_key = Column(String(255), default="")
    fallback_base_url = Column(String(255), default="")
    fallback_model = Column(String(80), default="")

    # System
    maintenance_mode = Column(Boolean, default=False)
    maintenance_message = Column(Text, default="")
    allow_registration = Column(Boolean, default=True)
    welcome_message = Column(Text, default="")
    site_name = Column(String(100), default="AI Workspace")
    site_description = Column(Text, default="")

    # Limits
    max_upload_mb = Column(Integer, default=25)
    daily_message_limit = Column(Integer, default=100)
    max_users = Column(Integer, default=0)
    rate_limit_per_minute = Column(Integer, default=20)

    # Security
    require_email_verification = Column(Boolean, default=False)
    min_password_length = Column(Integer, default=6)
    session_days = Column(Integer, default=7)

    # Defaults
    default_theme = Column(String(30), default="dark")
    default_model = Column(String(80), default="gpt-4o-mini")
    default_temperature = Column(Float, default=0.7)
    default_streaming = Column(Boolean, default=True)

    # ─── Referral & Gaming ───
    referral_enabled = Column(Boolean, default=True)
    referral_tokens = Column(Integer, default=10)
    gaming_theme_price = Column(Integer, default=50000)
    gaming_theme_token_price = Column(Integer, default=50)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
# AdminRequest
# ═══════════════════════════════════════════════════════════════
class AdminRequest(Base):
    __tablename__ = "admin_requests"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, default="")
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)


# ═══════════════════════════════════════════════════════════════
# Conversation
# ═══════════════════════════════════════════════════════════════
class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), default="گفتگوی جدید")
    pinned = Column(Boolean, default=False)
    archived = Column(Boolean, default=False)
    favorite = Column(Boolean, default=False)
    tags = Column(String(300), default="")
    summary = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


# ═══════════════════════════════════════════════════════════════
# Message
# ═══════════════════════════════════════════════════════════════
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(20))
    content = Column(Text)
    edited = Column(Boolean, default=False)
    bookmarked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


# ═══════════════════════════════════════════════════════════════
# Memory
# ═══════════════════════════════════════════════════════════════
class Memory(Base):
    __tablename__ = "memories"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    key = Column(String(200), default="")
    value = Column(Text, default="")
    category = Column(String(50), default="general")
    importance = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="memories")


# ═══════════════════════════════════════════════════════════════
# AuditLog
# ═══════════════════════════════════════════════════════════════
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), default="")
    action = Column(String(100), default="")
    details = Column(Text, default="")
    ip = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
# UploadedFile
# ═══════════════════════════════════════════════════════════════
class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(300))
    stored_path = Column(String(500))
    size = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
