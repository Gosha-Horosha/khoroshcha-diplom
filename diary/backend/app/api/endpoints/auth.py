# app/api/endpoints/auth.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from jwt.exceptions import PyJWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.db.models import User
from app.db.session import get_db
from app.schemas.diary import Token, UserCreate, UserLogin, UserRead,UserPublic


router = APIRouter()
security = HTTPBearer()


# @router.post("/register")
# def register(payload: UserCreate, db: Session = Depends(get_db)):
#     # print("1. payload received", payload)
#
#     existing_user = db.execute(
#         select(User).where(User.email == payload.email)
#     ).scalar_one_or_none()
#     # print("2. existing_user checked", existing_user)
#
#     user = User(
#         email=payload.email,
#         username=payload.username,
#         password_hash=get_password_hash(payload.password),
#         role="user"
#     )
#     # print("3. user object created")
#
#     db.add(user)
#     # print("4. added to session")
#
#     db.commit()
#     # print("5. committed")
#
#     db.refresh(user)
#     # print("6. refreshed")
#
#     return user

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, db: Session = Depends(get_session)):
    # 1. Проверка уникальности email
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # 2. Захешировать пароль
    pwd_hash = hash_password(payload.password)

    # 3. Создать пользователя
    user = models.User(
        email=payload.email,
        username=payload.username,
        password_hash=pwd_hash,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    print(payload.password, user.password_hash)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=60),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user = db.execute(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user