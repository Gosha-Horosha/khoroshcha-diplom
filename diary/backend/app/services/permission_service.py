from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status

from app.db.models import Permission, User


class PermissionService:
    @staticmethod
    def check_admin_permission(db: Session, user_id: int) -> bool:
        admin_permission = db.query(Permission).filter(
            Permission.user_id == user_id,
            Permission.permission_type == "admin"
        ).first()
        return admin_permission is not None
    
    @staticmethod
    def get_all_permissions(db: Session) -> List[Permission]:
        return db.query(Permission).all()
    
    @staticmethod
    def create_permission(db: Session, user_id: int, permission_type: str) -> Permission:
        # Проверяем существование пользователя
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Проверяем, не существует ли уже такое разрешение
        existing_permission = db.query(Permission).filter(
            Permission.user_id == user_id,
            Permission.permission_type == permission_type
        ).first()
        
        if existing_permission:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Permission already exists"
            )
        
        permission = Permission(
            user_id=user_id,
            permission_type=permission_type
        )
        
        db.add(permission)
        db.commit()
        db.refresh(permission)
        return permission
    
    @staticmethod
    def delete_permission(db: Session, permission_id: int) -> bool:
        permission = db.query(Permission).filter(Permission.id == permission_id).first()
        if not permission:
            return False
        
        db.delete(permission)
        db.commit()
        return True
    
    @staticmethod
    def get_user_permissions(db: Session, user_id: int) -> List[Permission]:
        return db.query(Permission).filter(Permission.user_id == user_id).all()