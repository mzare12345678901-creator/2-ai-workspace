from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Memory, User
from app.schemas import MemoryIn, MemoryOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("/", response_model=List[MemoryOut])
def list_memories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Memory).filter(Memory.user_id == user.id)\
             .order_by(Memory.importance.desc(), Memory.updated_at.desc()).all()


@router.post("/", response_model=MemoryOut)
def create_memory(data: MemoryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = Memory(user_id=user.id, **data.dict())
    db.add(m); db.commit(); db.refresh(m)
    return m


@router.patch("/{mid}", response_model=MemoryOut)
def update_memory(mid: int, data: MemoryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Memory).filter(Memory.id == mid, Memory.user_id == user.id).first()
    if not m: raise HTTPException(404, "یافت نشد")
    for k, v in data.dict().items():
        setattr(m, k, v)
    db.commit(); db.refresh(m)
    return m


@router.delete("/{mid}")
def delete_memory(mid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Memory).filter(Memory.id == mid, Memory.user_id == user.id).first()
    if not m: raise HTTPException(404, "یافت نشد")
    db.delete(m); db.commit()
    return {"ok": True}