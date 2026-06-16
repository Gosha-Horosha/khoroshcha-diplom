from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Favorite, Post, User
from app.schemas.diary import FavoriteCreate
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.diary import _visibility_clause, _serialize_post

router = APIRouter()


@router.get("/favorites")
def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Избранные посты, к которым у пользователя ещё есть доступ."""
    rows = db.execute(
        select(Post, Favorite.created_at)
        .join(Favorite, Favorite.post_id == Post.id)
        .where(Favorite.user_id == current_user.id)
        .where(Post.status == "active")
        .where(_visibility_clause(current_user.id))
        .order_by(Favorite.created_at.desc())
    ).all()

    items = [
        _serialize_post(post, current_user.id, is_favorited=True, favorited_at=favorited_at)
        for post, favorited_at in rows
    ]
    return {"items": items}


@router.get("/favorites/ids")
def list_favorite_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Только id избранных постов — для отметки на других страницах."""
    rows = db.execute(
        select(Favorite.post_id).where(Favorite.user_id == current_user.id)
    ).scalars().all()
    return {"ids": [str(pid) for pid in rows]}


@router.post("/favorites", status_code=status.HTTP_201_CREATED)
def add_favorite(
    payload: FavoriteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.execute(
        select(Post)
        .where(Post.id == payload.post_id)
        .where(_visibility_clause(current_user.id))
    ).scalar_one_or_none()

    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or not accessible",
        )

    existing = db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.post_id == payload.post_id,
        )
    ).scalar_one_or_none()

    if existing is not None:
        return _serialize_post(post, current_user.id, is_favorited=True)

    favorite = Favorite(user_id=current_user.id, post_id=payload.post_id)
    db.add(favorite)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    return _serialize_post(post, current_user.id, is_favorited=True)


@router.delete("/favorites/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    favorite = db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.post_id == post_id,
        )
    ).scalar_one_or_none()

    if favorite is not None:
        db.delete(favorite)
        db.commit()

    return None
