# app/api/endpoints/auth.py
from datetime import timedelta, datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import PyJWTError
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.db.models import Post, User
from app.db.session import get_db
from app.schemas.diary import Token, UserCreate, UserLogin, UserRead, UserPublic, ForgotPasswordRequest, \
    ResetPasswordRequest, ProfileRead, ProfileUpdate, VerifyEmailRequest, ResendVerificationRequest, \
    DeleteAccountRequest
from app.core.mail import render_template, send_email_html


router = APIRouter()
security = HTTPBearer(auto_error=False)


@router.post("/login", response_model=Token)
def login_user(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    password_hash = getattr(user, "hashed_password", None)
    if password_hash is None:
        password_hash = getattr(user, "password_hash", None)

    if not password_hash or not verify_password(payload.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not getattr(user, "is_verified", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Почта не подтверждена. Проверьте письмо со ссылкой подтверждения.",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "username": user.username,
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
    )


def create_email_verification_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.EMAIL_VERIFY_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "purpose": "email_verify",
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def send_verification_email(user: User) -> None:
    """Отправляет письмо с ссылкой подтверждения. Не валит вызов при сбое SMTP."""
    token = create_email_verification_token(user)
    verify_link = f"{settings.FRONTEND_URL}/verify-email.html?token={token}"

    try:
        html = render_template(
            "emails/verify_email.html",
            {
                "app_name": "Night Archive",
                "username": user.username,
                "verify_link": verify_link,
                "expire_minutes": settings.EMAIL_VERIFY_EXPIRE_MINUTES,
            },
        )
        send_email_html(
            to_email=user.email,
            subject="Подтвердите почту — Night Archive",
            html_body=html,
        )
    except Exception:
        # Письмо — не критичный путь: пользователь сможет запросить повторно.
        pass


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = db.execute(
        select(User).where(
            or_(
                User.email == payload.email,
                User.username == payload.username,
            )
        )
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered",
        )
    # print("1")
    try:
        # print("12")
        user = User(
            email=payload.email,
            username=payload.username,
            password_hash=get_password_hash(payload.password),
        )
        # print("13")
        db.add(user)
        db.flush()
        user_post = Post(
            user_id=user.id,
            parent_id=None,
            type="user",
            display_name=payload.username,
            visibility_mode="private",
            status="active",
            content_json={
                "title": payload.username,
                "text": "",
                "excerpt": "",
            },
        )
        print("14")
        db.add(user_post)
        db.commit()
        db.refresh(user)

        # Письмо с ссылкой подтверждения почты.
        send_verification_email(user)

        return user

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered",
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@router.get("/me", response_model=UserPublic)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    payload: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удаляет аккаунт текущего пользователя (с подтверждением паролем).

    Каскадно удаляет записи, дружбы и избранное (FK ON DELETE CASCADE +
    cascade на relationship User.posts).
    """
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный пароль.",
        )

    # Core DELETE → каскады БД (posts, friendships, favorites) без ORM-нюансов
    # с самоссылкой posts.parent_id.
    db.execute(delete(User).where(User.id == current_user.id))
    db.commit()
    return None


def _get_user_root_post(db: Session, user: User) -> Post | None:
    """Корневой пост-профиль (type='user') хранит bio пользователя."""
    return db.execute(
        select(Post)
        .where(Post.user_id == user.id)
        .where(Post.type == "user")
        .order_by(Post.created_at.asc())
    ).scalars().first()


@router.get("/profile", response_model=ProfileRead)
def read_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    root = _get_user_root_post(db, current_user)
    bio = ""
    if root and isinstance(root.content_json, dict):
        bio = root.content_json.get("text") or ""

    return ProfileRead(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        bio=bio,
    )


@router.patch("/profile", response_model=ProfileRead)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.username is not None and payload.username != current_user.username:
        clash = db.execute(
            select(User).where(
                User.username == payload.username,
                User.id != current_user.id,
            )
        ).scalar_one_or_none()
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        current_user.username = payload.username

    root = _get_user_root_post(db, current_user)

    if payload.bio is not None and root is not None:
        content = dict(root.content_json or {})
        content["text"] = payload.bio
        content["excerpt"] = payload.bio[:180]
        root.content_json = content

    # Имя профиля в корневом посте держим в синхроне с username.
    if payload.username is not None and root is not None:
        root.display_name = current_user.username
        content = dict(root.content_json or {})
        content["title"] = current_user.username
        root.content_json = content

    db.commit()
    db.refresh(current_user)

    bio = ""
    if root and isinstance(root.content_json, dict):
        bio = root.content_json.get("text") or ""

    return ProfileRead(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        bio=bio,
    )


def create_password_reset_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "purpose": "password_reset",
        "pwd": user.password_hash,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    if user:
        token = create_password_reset_token(user)
        reset_link = f"{settings.FRONTEND_URL}/reset-password.html?token={token}"

        html = render_template(
            "emails/reset_password.html",
            {
                "app_name": "Night Archive",
                "username": user.username,
                "reset_link": reset_link,
                "expire_minutes": settings.PASSWORD_RESET_EXPIRE_MINUTES,
            },
        )

        send_email_html(
            to_email=user.email,
            subject="Reset your password",
            html_body=html,
        )

    return {
        "message": "If an account exists for this email, a reset link has been sent."
    }

@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        token_data = jwt.decode(
            payload.token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if token_data.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    user_id = token_data.get("sub")
    password_hash_from_token = token_data.get("pwd")

    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    if user.password_hash != password_hash_from_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is no longer valid",
        )

    user.password_hash = get_password_hash(payload.new_password)
    db.add(user)
    db.commit()

    return {"message": "Password updated successfully"}


@router.post("/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    try:
        token_data = jwt.decode(
            payload.token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительная или истёкшая ссылка подтверждения.",
        )

    if token_data.get("purpose") != "email_verify":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительная ссылка подтверждения.",
        )

    user = db.execute(
        select(User).where(User.id == token_data.get("sub"))
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь не найден.",
        )

    if not user.is_verified:
        user.is_verified = True
        db.add(user)
        db.commit()

    return {"message": "Почта подтверждена. Теперь можно войти."}


@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    # Письмо шлём только если есть неподтверждённый аккаунт, но ответ всегда общий.
    if user and not user.is_verified:
        send_verification_email(user)

    return {
        "message": "Если аккаунт существует и ещё не подтверждён, мы отправили письмо повторно."
    }

