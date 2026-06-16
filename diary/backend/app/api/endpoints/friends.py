from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Friendship, User
from app.schemas.diary import FriendshipCreate, FriendshipUpdate
from app.api.endpoints.auth import get_current_user

router = APIRouter()


def _group_of(is_close: bool) -> str:
    """Группа дружбы: близкие друзья или обычные друзья."""
    return "close_friends" if is_close else "friends"


def _serialize(friendship: Friendship, other: User, current_user_id) -> dict:
    return {
        "id": str(friendship.id),
        "user_id": str(other.id),
        "username": other.username,
        "email": other.email,
        "status": friendship.status,
        "is_close": friendship.is_close,
        "group": _group_of(friendship.is_close),
        # outgoing — заявку отправил текущий пользователь, incoming — получил.
        "direction": "outgoing" if friendship.user_id == current_user_id else "incoming",
        "created_at": friendship.created_at.isoformat() if friendship.created_at else None,
    }


@router.get("/friends")
def list_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Все дружбы текущего пользователя (входящие и исходящие)."""
    rows = db.execute(
        select(Friendship).where(
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            )
        )
    ).scalars().all()

    items = []
    for fr in rows:
        other_id = fr.friend_id if fr.user_id == current_user.id else fr.user_id
        other = db.execute(
            select(User).where(User.id == other_id)
        ).scalar_one_or_none()
        if other is None:
            continue
        items.append(_serialize(fr, other, current_user.id))

    return {"items": items}


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список пользователей для добавления в друзья (кроме себя)."""
    users = db.execute(
        select(User).where(User.id != current_user.id).order_by(User.username.asc())
    ).scalars().all()

    friendships = db.execute(
        select(Friendship).where(
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            )
        )
    ).scalars().all()

    # Карта: other_user_id -> friendship, чтобы знать текущее состояние связи.
    by_user = {}
    for fr in friendships:
        other_id = fr.friend_id if fr.user_id == current_user.id else fr.user_id
        by_user[str(other_id)] = fr

    items = []
    for user in users:
        fr = by_user.get(str(user.id))
        items.append({
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "friendship_id": str(fr.id) if fr else None,
            "status": fr.status if fr else None,
            "is_close": fr.is_close if fr else False,
            "group": _group_of(fr.is_close) if fr else None,
        })

    return {"items": items}


@router.post("/friends", status_code=status.HTTP_201_CREATED)
def add_friend(
    payload: FriendshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить заявку в друзья (с выбором группы)."""
    if payload.friend_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a friend",
        )

    friend = db.execute(
        select(User).where(User.id == payload.friend_id)
    ).scalar_one_or_none()
    if friend is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    existing = db.execute(
        select(Friendship).where(
            or_(
                and_(
                    Friendship.user_id == current_user.id,
                    Friendship.friend_id == payload.friend_id,
                ),
                and_(
                    Friendship.user_id == payload.friend_id,
                    Friendship.friend_id == current_user.id,
                ),
            )
        )
    ).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friendship already exists",
        )

    friendship = Friendship(
        user_id=current_user.id,
        friend_id=payload.friend_id,
        status="pending",
        is_close=payload.is_close,
    )
    db.add(friendship)
    db.commit()
    db.refresh(friendship)

    return _serialize(friendship, friend, current_user.id)


def _load_friendship(db: Session, friendship_id: UUID, current_user: User) -> Friendship:
    friendship = db.execute(
        select(Friendship).where(Friendship.id == friendship_id)
    ).scalar_one_or_none()

    if friendship is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found",
        )

    if current_user.id not in (friendship.user_id, friendship.friend_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this friendship",
        )

    return friendship


@router.patch("/friends/{friendship_id}")
def update_friend(
    friendship_id: UUID,
    payload: FriendshipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Принять/отклонить заявку или сменить группу друга."""
    friendship = _load_friendship(db, friendship_id, current_user)

    if payload.status is not None:
        # Принимать/отклонять входящую заявку может только получатель.
        if friendship.friend_id != current_user.id and payload.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the recipient can accept a request",
            )
        friendship.status = payload.status

    if payload.is_close is not None:
        friendship.is_close = payload.is_close

    db.commit()
    db.refresh(friendship)

    other_id = friendship.friend_id if friendship.user_id == current_user.id else friendship.user_id
    other = db.execute(select(User).where(User.id == other_id)).scalar_one()

    return _serialize(friendship, other, current_user.id)


@router.delete("/friends/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_friend(
    friendship_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить дружбу/отменить заявку."""
    friendship = _load_friendship(db, friendship_id, current_user)
    db.delete(friendship)
    db.commit()
    return None
