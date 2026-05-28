# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from typing import List
#
# from app.db.session import get_db
# from app.db.models import Permission, User
# from app.schemas.diary import Permission as PermissionSchema, PermissionCreate
# from app.api.dependencies import get_current_user
#
# router = APIRouter()
#
#
# @router.get("/", response_model=List[PermissionSchema])
# def read_permissions(
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     # Проверяем, есть ли у пользователя права администратора
#     admin_permission = db.query(Permission).filter(
#         Permission.user_id == current_user.id,
#         Permission.permission_type == "admin"
#     ).first()
#
#     if not admin_permission:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required")
#
#     permissions = db.query(Permission).all()
#     return permissions
#
#
# @router.post("/", response_model=PermissionSchema)
# def create_permission(
#     permission: PermissionCreate,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     # Проверяем, есть ли у пользователя права администратора
#     admin_permission = db.query(Permission).filter(
#         Permission.user_id == current_user.id,
#         Permission.permission_type == "admin"
#     ).first()
#
#     if not admin_permission:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required")
#
#     # Проверяем, существует ли пользователь
#     user = db.query(User).filter(User.id == permission.user_id).first()
#     if not user:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
#
#     # Проверяем, не существует ли уже такое разрешение
#     existing_permission = db.query(Permission).filter(
#         Permission.user_id == permission.user_id,
#         Permission.permission_type == permission.permission_type
#     ).first()
#
#     if existing_permission:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Permission already exists")
#
#     db_permission = Permission(
#         user_id=permission.user_id,
#         permission_type=permission.permission_type
#     )
#
#     db.add(db_permission)
#     db.commit()
#     db.refresh(db_permission)
#     return db_permission
#
#
# @router.delete("/{permission_id}")
# def delete_permission(
#     permission_id: int,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     # Проверяем, есть ли у пользователя права администратора
#     admin_permission = db.query(Permission).filter(
#         Permission.user_id == current_user.id,
#         Permission.permission_type == "admin"
#     ).first()
#
#     if not admin_permission:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required")
#
#     permission = db.query(Permission).filter(Permission.id == permission_id).first()
#     if not permission:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
#
#     db.delete(permission)
#     db.commit()
#     return {"message": "Permission deleted successfully"}