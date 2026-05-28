from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Post, User
from app.schemas.diary import PostRead, PostCreate, UserRead, PostUpdate

router = APIRouter()


@router.get("/post", response_model=List[PostRead])
def list_posts(db: Session = Depends(get_db)):
    posts = db.query(Post).all()
    return posts


@router.get("/post/{post_id}", response_model=PostRead)
def get_post(post_id: UUID, db: Session = Depends(get_db)):
    post = db.query(Post).get(post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    return post


@router.post("/post/", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreate, db: Session = Depends(get_db)):
    post = Post(**payload.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post




# Users
@router.get("/user", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


@router.get("/user/{user_id}", response_model=UserRead)
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user




# posts endpoints


@router.post("/posts", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreate, db: Session = Depends(get_db)):
    post = Post(**payload.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get("/posts", response_model=List[PostRead])
def list_posts(db: Session = Depends(get_db)):
    posts = db.execute(
        select(Post).order_by(Post.created_at.desc())
    ).scalars().all()
    return posts


@router.get("/posts/{post_id}", response_model=PostRead)
def get_post(post_id: UUID, db: Session = Depends(get_db)):
    post = db.execute(
        select(Post).where(Post.id == post_id)
    ).scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    return post


@router.patch("/posts/{post_id}", response_model=PostRead)
def update_post(post_id: UUID, payload: PostUpdate, db: Session = Depends(get_db)):
    post = db.execute(
        select(Post).where(Post.id == post_id)
    ).scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    db.commit()
    db.refresh(post)
    return post


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: UUID, db: Session = Depends(get_db)):
    post = db.execute(
        select(Post).where(Post.id == post_id)
    ).scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    db.delete(post)
    db.commit()
    return None


@router.get("/posts/{post_id}/children", response_model=List[PostRead])
def get_post_children(post_id: UUID, db: Session = Depends(get_db)):
    children = db.execute(
        select(Post)
        .where(Post.parent_id == post_id)
        .order_by(Post.created_at.asc())
    ).scalars().all()

    return children
