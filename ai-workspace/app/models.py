from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    theme = Column(String(30), default="dark")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")


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


class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True)
    ai_api_key = Column(String(255), default="")
    ai_base_url = Column(String(255), default="https://api.openai.com/v1")
    ai_model = Column(String(80), default="gpt-4o-mini")
    ai_temperature = Column(Float, default=0.7)
    ai_max_tokens = Column(Integer, default=2048)
    ai_system_prompt = Column(Text, default="")
    fallback_enabled = Column(Boolean, default=False)
    fallback_api_key = Column(String(255), default="")
    fallback_base_url = Column(String(255), default="")
    fallback_model = Column(String(80), default="")
    maintenance_mode = Column(Boolean, default=False)
    maintenance_message = Column(Text, default="")
    allow_registration = Column(Boolean, default=True)
    welcome_message = Column(Text, default="")
    site_name = Column(String(100), default="AI Workspace")
    site_description = Column(Text, default="")
    max_upload_mb = Column(Integer, default=25)
    daily_message_limit = Column(Integer, default=100)
    max_users = Column(Integer, default=0)
    rate_limit_per_minute = Column(Integer, default=20)
    require_email_verification = Column(Boolean, default=False)
    min_password_length = Column(Integer, default=6)
    session_days = Column(Integer, default=7)
    default_theme = Column(String(30), default="dark")
    default_model = Column(String(80), default="gpt-4o-mini")
    default_temperature = Column(Float, default=0.7)
    default_streaming = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdminRequest(Base):
    __tablename__ = "admin_requests"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, default="")
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), default="گفتگوی جدید")
    pinned = Column(Boolean, default=False)          # 📌 سنجاق
    archived = Column(Boolean, default=False)        # 🗄️ آرشیو
    favorite = Column(Boolean, default=False)        # ⭐ علاقه‌مندی
    tags = Column(String(300), default="")           # 🏷️ تگ‌ها (با کاما)
    summary = Column(Text, default="")               # 📝 خلاصه
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(20))
    content = Column(Text)
    edited = Column(Boolean, default=False)          # ✏️ ویرایش‌شده
    bookmarked = Column(Boolean, default=False)      # 🔖 بوکمارک
    created_at = Column(DateTime, default=datetime.utcnow)
    conversation = relationship("Conversation", back_populates="messages")


class Memory(Base):
    __tablename__ = "memories"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    key = Column(String(200), default="")
    value = Column(Text, default="")
    category = Column(String(50), default="general")
    importance = Column(Integer, default=5)          # 1-10
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="memories")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), default="")
    action = Column(String(100), default="")
    details = Column(Text, default="")
    ip = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(300))
    stored_path = Column(String(500))
    size = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)