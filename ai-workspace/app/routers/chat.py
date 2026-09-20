from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import json
from app.database import get_db
from app.models import Conversation, Message, UploadedFile, User, UserSettings, Memory
from app.schemas import (ChatRequest, ChatResponse, MessageOut, ConversationOut,
                         ConversationUpdate, MessageEdit)
from app.ai_gateway import ai_gateway
from app.agent import agent
from app.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])


def get_user_settings(user, db):
    return db.query(UserSettings).filter(UserSettings.user_id == user.id).first()


# ═══════════════════════════════════════
# Conversations CRUD
# ═══════════════════════════════════════
@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(
    archived: bool = False,
    q: Optional[str] = None,
    favorite: Optional[bool] = None,
    tag: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Conversation).filter(
        Conversation.user_id == user.id,
        Conversation.archived == archived,
    )
    if q:
        query = query.filter(or_(
            Conversation.title.contains(q),
            Conversation.tags.contains(q),
        ))
    if favorite is not None:
        query = query.filter(Conversation.favorite == favorite)
    if tag:
        query = query.filter(Conversation.tags.contains(tag))

    return query.order_by(
        Conversation.pinned.desc(),
        Conversation.updated_at.desc()
    ).all()


@router.post("/conversations", response_model=ConversationOut)
def new_conversation(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = Conversation(user_id=user.id, title="گفتگوی جدید")
    db.add(c); db.commit(); db.refresh(c)
    return c


@router.patch("/conversations/{cid}", response_model=ConversationOut)
def update_conversation(
    cid: int,
    data: ConversationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(
        Conversation.id == cid, Conversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(404, "گفتگو یافت نشد")
    for k, v in data.dict(exclude_none=True).items():
        setattr(conv, k, v)
    db.commit(); db.refresh(conv)
    return conv


@router.post("/conversations/{cid}/duplicate", response_model=ConversationOut)
def duplicate_conversation(cid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == cid, Conversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(404, "گفتگو یافت نشد")
    new = Conversation(
        user_id=user.id,
        title=conv.title + " (کپی)",
        tags=conv.tags,
    )
    db.add(new); db.commit(); db.refresh(new)
    for m in conv.messages:
        db.add(Message(conversation_id=new.id, role=m.role, content=m.content))
    db.commit(); db.refresh(new)
    return new


@router.get("/conversations/{cid}/messages", response_model=List[MessageOut])
def get_messages(cid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == cid, Conversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(404, "گفتگو یافت نشد")
    return conv.messages


@router.delete("/conversations/{cid}")
def delete_conversation(cid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == cid, Conversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(404, "گفتگو یافت نشد")
    db.delete(conv); db.commit()
    return {"ok": True}


# ═══════════════════════════════════════
# Message Actions
# ═══════════════════════════════════════
@router.patch("/messages/{mid}", response_model=MessageOut)
def edit_message(
    mid: int,
    data: MessageEdit,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.query(Message).join(Conversation).filter(
        Message.id == mid, Conversation.user_id == user.id
    ).first()
    if not msg:
        raise HTTPException(404, "پیام یافت نشد")
    msg.content = data.content
    msg.edited = True
    db.commit(); db.refresh(msg)
    return msg


@router.post("/messages/{mid}/bookmark", response_model=MessageOut)
def toggle_bookmark(mid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).join(Conversation).filter(
        Message.id == mid, Conversation.user_id == user.id
    ).first()
    if not msg:
        raise HTTPException(404, "پیام یافت نشد")
    msg.bookmarked = not msg.bookmarked
    db.commit(); db.refresh(msg)
    return msg


@router.delete("/messages/{mid}")
def delete_message(mid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).join(Conversation).filter(
        Message.id == mid, Conversation.user_id == user.id
    ).first()
    if not msg:
        raise HTTPException(404, "پیام یافت نشد")
    db.delete(msg); db.commit()
    return {"ok": True}


@router.post("/messages/{mid}/regenerate", response_model=ChatResponse)
async def regenerate_message(mid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """پیام دستیار رو دوباره تولید کن"""
    msg = db.query(Message).join(Conversation).filter(
        Message.id == mid, Conversation.user_id == user.id
    ).first()
    if not msg or msg.role != "assistant":
        raise HTTPException(404, "پیام دستیار یافت نشد")

    conv = msg.conversation
    # حذف پیام فعلی
    db.delete(msg); db.commit()

    # ساخت context
    us = get_user_settings(user, db)
    limit = us.context_messages if us else 20
    history = [{"role": m.role, "content": m.content}
               for m in conv.messages if m.role in ("user", "assistant")][-limit:]

    reply = await ai_gateway.chat(
        history,
        system_prompt=us.system_prompt if us else None,
        temperature=us.temperature if us else 0.7,
        max_tokens=us.max_tokens if us else 2048,
        model=us.model if us else None,
    )
    db.add(Message(conversation_id=conv.id, role="assistant", content=reply))
    db.commit()
    return ChatResponse(conversation_id=conv.id, reply=reply)


# ═══════════════════════════════════════
# Export
# ═══════════════════════════════════════
@router.get("/conversations/{cid}/export")
def export_conversation(cid: int, fmt: str = "md", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == cid, Conversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(404, "گفتگو یافت نشد")

    if fmt == "json":
        data = {
            "title": conv.title,
            "created_at": conv.created_at.isoformat(),
            "tags": conv.tags,
            "messages": [{"role": m.role, "content": m.content, "at": m.created_at.isoformat()} for m in conv.messages],
        }
        content = json.dumps(data, ensure_ascii=False, indent=2)
        media = "application/json"; ext = "json"
    elif fmt == "txt":
        lines = [f"# {conv.title}\n"]
        for m in conv.messages:
            who = "کاربر" if m.role == "user" else "دستیار"
            lines.append(f"\n[{who}]\n{m.content}\n")
        content = "\n".join(lines); media = "text/plain; charset=utf-8"; ext = "txt"
    else:
        lines = [f"# {conv.title}\n", f"*تاریخ: {conv.created_at.strftime('%Y-%m-%d %H:%M')}*\n"]
        for m in conv.messages:
            who = "🧑 **کاربر**" if m.role == "user" else "🤖 **دستیار**"
            lines.append(f"\n### {who}\n\n{m.content}\n")
        content = "\n".join(lines); media = "text/markdown; charset=utf-8"; ext = "md"

    return Response(content=content, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="chat-{cid}.{ext}"'})


# ═══════════════════════════════════════
# Search
# ═══════════════════════════════════════
@router.get("/search")
def search_messages(q: str = Query(..., min_length=1), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = db.query(Message).join(Conversation).filter(
        Conversation.user_id == user.id,
        Message.content.contains(q),
    ).order_by(Message.created_at.desc()).limit(50).all()
    return [{
        "message_id": m.id,
        "conversation_id": m.conversation_id,
        "conversation_title": m.conversation.title,
        "role": m.role,
        "content": m.content[:200],
        "created_at": m.created_at.isoformat(),
    } for m in results]


# ═══════════════════════════════════════
# Send (معمولی + Streaming)
# ═══════════════════════════════════════
@router.post("/send", response_model=ChatResponse)
async def send_message(req: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == req.conversation_id, Conversation.user_id == user.id
        ).first()
        if not conv: raise HTTPException(404, "گفتگو یافت نشد")
    else:
        title = req.message[:40] + ("..." if len(req.message) > 40 else "")
        conv = Conversation(user_id=user.id, title=title or "گفتگوی جدید")
        db.add(conv); db.commit(); db.refresh(conv)

    extra_context = ""
    if req.file_ids:
        files = db.query(UploadedFile).filter(
            UploadedFile.id.in_(req.file_ids), UploadedFile.user_id == user.id
        ).all()
        for f in files:
            try:
                text = open(f.stored_path, "r", encoding="utf-8", errors="ignore").read()[:4000]
                extra_context += f"\n\n[فایل {f.filename}]:\n{text}"
            except: pass

    db.add(Message(conversation_id=conv.id, role="user", content=req.message))
    db.commit()

    us = get_user_settings(user, db)
    limit = us.context_messages if us else 20
    history = [{"role": m.role, "content": m.content}
               for m in conv.messages if m.role in ("user", "assistant")][-limit:]
    if extra_context and history:
        history[-1]["content"] += extra_context

    # اضافه کردن حافظه‌ها
    mems = db.query(Memory).filter(Memory.user_id == user.id).order_by(Memory.importance.desc()).limit(5).all()
    sys_prompt = us.system_prompt if us and us.system_prompt else None
    if mems:
        mem_text = "\n".join([f"- {m.key}: {m.value}" for m in mems])
        sys_prompt = (sys_prompt or "") + f"\n\nاطلاعات مهم درباره کاربر:\n{mem_text}"

    reply = await ai_gateway.chat(
        history, system_prompt=sys_prompt,
        temperature=us.temperature if us else 0.7,
        max_tokens=us.max_tokens if us else 2048,
        model=us.model if us else None,
    )
    db.add(Message(conversation_id=conv.id, role="assistant", content=reply))
    db.commit()
    return ChatResponse(conversation_id=conv.id, reply=reply)


@router.post("/stream")
async def stream_message(req: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == req.conversation_id, Conversation.user_id == user.id
        ).first()
        if not conv: raise HTTPException(404, "گفتگو یافت نشد")
    else:
        title = req.message[:40] + ("..." if len(req.message) > 40 else "")
        conv = Conversation(user_id=user.id, title=title or "گفتگوی جدید")
        db.add(conv); db.commit(); db.refresh(conv)

    extra_context = ""
    if req.file_ids:
        files = db.query(UploadedFile).filter(
            UploadedFile.id.in_(req.file_ids), UploadedFile.user_id == user.id
        ).all()
        for f in files:
            try:
                text = open(f.stored_path, "r", encoding="utf-8", errors="ignore").read()[:4000]
                extra_context += f"\n\n[فایل {f.filename}]:\n{text}"
            except: pass

    db.add(Message(conversation_id=conv.id, role="user", content=req.message))
    db.commit()

    us = get_user_settings(user, db)
    limit = us.context_messages if us else 20
    history = [{"role": m.role, "content": m.content}
               for m in conv.messages if m.role in ("user", "assistant")][-limit:]
    if extra_context and history:
        history[-1]["content"] += extra_context

    sys_prompt = us.system_prompt if us and us.system_prompt else None
    mems = db.query(Memory).filter(Memory.user_id == user.id).order_by(Memory.importance.desc()).limit(5).all()
    if mems:
        mem_text = "\n".join([f"- {m.key}: {m.value}" for m in mems])
        sys_prompt = (sys_prompt or "") + f"\n\nاطلاعات مهم درباره کاربر:\n{mem_text}"

    conv_id = conv.id

    async def event_stream():
        full_reply = ""
        try:
            async for chunk in ai_gateway.chat_stream(
                history, system_prompt=sys_prompt,
                temperature=us.temperature if us else 0.7,
                max_tokens=us.max_tokens if us else 2048,
                model=us.model if us else None,
            ):
                full_reply += chunk
                yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            try:
                db.add(Message(conversation_id=conv_id, role="assistant", content=full_reply))
                db.commit()
            except: pass
            yield f"data: {json.dumps({'done': True, 'conversation_id': conv_id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/conversations/{cid}/auto-name", response_model=ConversationOut)
async def auto_name_conversation(cid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """تولید خودکار نام گفتگو با AI"""
    conv = db.query(Conversation).filter(
        Conversation.id == cid, Conversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(404, "گفتگو یافت نشد")

    msgs = conv.messages
    if not msgs:
        raise HTTPException(400, "گفتگو خالی است")

    # اولین پیام کاربر
    first_user = next((m for m in msgs if m.role == "user"), None)
    if not first_user:
        return conv

    try:
        title_prompt = f"""این پیام کاربره. یه عنوان کوتاه (حداکثر ۵ کلمه) به فارسی بده که موضوع رو خلاصه کنه. فقط خود عنوان رو بنویس، هیچ چیز دیگه‌ای اضافه نکن.

پیام: {first_user.content[:500]}

عنوان:"""
        new_title = await ai_gateway.chat(
            [{"role": "user", "content": title_prompt}],
            temperature=0.3,
            max_tokens=50,
        )
        # پاکسازی
        new_title = new_title.strip().strip('"').strip("'").strip("عنوان:").strip()
        if new_title and len(new_title) < 100:
            conv.title = new_title[:100]
            db.commit(); db.refresh(conv)
    except Exception:
        pass

    return conv


@router.post("/messages/{mid}/continue", response_model=ChatResponse)
async def continue_message(mid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """ادامه‌ی پاسخ دستیار"""
    msg = db.query(Message).join(Conversation).filter(
        Message.id == mid, Conversation.user_id == user.id
    ).first()
    if not msg or msg.role != "assistant":
        raise HTTPException(404, "پیام دستیار یافت نشد")

    conv = msg.conversation
    us = get_user_settings(user, db)

    # context شامل پاسخ فعلی + درخواست ادامه
    history = [{"role": m.role, "content": m.content}
               for m in conv.messages if m.role in ("user", "assistant")]
    history.append({"role": "user", "content": "ادامه بده از جایی که قطع شد. فقط ادامه رو بنویس، تکرار نکن."})

    reply = await ai_gateway.chat(
        history,
        system_prompt=us.system_prompt if us else None,
        temperature=us.temperature if us else 0.7,
        max_tokens=us.max_tokens if us else 2048,
        model=us.model if us else None,
    )

    # اضافه کردن به پیام فعلی
    msg.content = msg.content + "\n\n" + reply
    db.commit(); db.refresh(msg)
    return ChatResponse(conversation_id=conv.id, reply=reply)
def agent_state(q: str = ""):
    return agent.state(q)