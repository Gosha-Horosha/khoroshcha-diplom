from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status

from app.db.models import DiaryEntry


class DiaryService:
    @staticmethod
    def get_user_entries(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[DiaryEntry]:
        return db.query(DiaryEntry).filter(DiaryEntry.user_id == user_id).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_entry_by_id(db: Session, entry_id: int, user_id: int) -> Optional[DiaryEntry]:
        entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
        if not entry:
            return None
        
        if entry.user_id != user_id and not entry.is_public:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        return entry
    
    @staticmethod
    def create_entry(db: Session, title: str, content: str, user_id: int, is_public: bool = False) -> DiaryEntry:
        entry = DiaryEntry(
            title=title,
            content=content,
            user_id=user_id,
            is_public=is_public
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    
    @staticmethod
    def update_entry(db: Session, entry_id: int, user_id: int, **kwargs) -> Optional[DiaryEntry]:
        entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
        if not entry:
            return None
        
        if entry.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        for key, value in kwargs.items():
            if value is not None:
                setattr(entry, key, value)
        
        db.commit()
        db.refresh(entry)
        return entry
    
    @staticmethod
    def delete_entry(db: Session, entry_id: int, user_id: int) -> bool:
        entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
        if not entry:
            return False
        
        if entry.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        db.delete(entry)
        db.commit()
        return True