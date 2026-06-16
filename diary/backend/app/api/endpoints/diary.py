from typing import List, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, exists, func, or_, select, text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Favorite, Friendship, Post, User
from app.schemas.diary import PostRead, PostCreate, PostUpdate
from app.api.endpoints.auth import get_current_user

router = APIRouter()

def _visibility_clause(current_user_id):
    """Фильтр видимости: показывает только посты, доступные текущему пользователю."""
    is_friend = exists(
        select(Friendship.id).where(
            or_(
                and_(
                    Friendship.user_id == current_user_id,
                    Friendship.friend_id == Post.user_id,
                    Friendship.status == "accepted",
                ),
                and_(
                    Friendship.user_id == Post.user_id,
                    Friendship.friend_id == current_user_id,
                    Friendship.status == "accepted",
                ),
            )
        )
    )

    is_close_friend = exists(
        select(Friendship.id).where(
            or_(
                and_(
                    Friendship.user_id == current_user_id,
                    Friendship.friend_id == Post.user_id,
                    Friendship.status == "accepted",
                    Friendship.is_close.is_(True),
                ),
                and_(
                    Friendship.user_id == Post.user_id,
                    Friendship.friend_id == current_user_id,
                    Friendship.status == "accepted",
                    Friendship.is_close.is_(True),
                ),
            )
        )
    )

    return or_(
        Post.user_id == current_user_id,
        Post.visibility_mode == "public",
        and_(Post.visibility_mode == "friends", is_friend),
        and_(Post.visibility_mode == "close_friends", is_close_friend),
    )


def _serialize_post(post, current_user_id, is_favorited=False, favorited_at=None):
    """Плоское представление поста для ленты, избранного и чтения."""
    content = post.content_json or {}
    title = content.get("title") or post.display_name or "Запись без заголовка"
    excerpt = (
        content.get("excerpt")
        or content.get("preview")
        or content.get("text")
        or ""
    )

    data = {
        "id": str(post.id),
        "type": post.type,
        "title": title,
        "excerpt": excerpt,
        "preview": excerpt,
        "topic": content.get("topic") or None,
        "content_json": content,
        "display_name": post.display_name,
        "visibility_mode": post.visibility_mode,
        "status": post.status,
        "user_id": str(post.user_id),
        "parent_id": str(post.parent_id) if post.parent_id else None,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "updated_at": post.updated_at.isoformat() if post.updated_at else None,
        "is_mine": str(post.user_id) == str(current_user_id),
        "is_favorited": is_favorited,
    }

    if favorited_at is not None:
        data["favorited_at"] = favorited_at.isoformat()

    return data


@router.get("/feed")
def get_feed(
    scope: Literal["all", "mine"] = "all",
    kind: Literal["all", "roots", "replies"] = "all",
    topic: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limit = max(1, min(limit, 100))

    query = (
        select(Post)
        .where(Post.status == "active")
        .where(Post.type == "post")
        .where(_visibility_clause(current_user.id))
    )

    if scope == "mine":
        query = query.where(Post.user_id == current_user.id)

    if kind == "roots":
        query = query.where(Post.parent_id.is_(None))
    elif kind == "replies":
        query = query.where(Post.parent_id.is_not(None))

    if topic:
        query = query.where(Post.content_json["topic"].astext == topic)

    posts = db.execute(
        query.order_by(Post.created_at.desc()).limit(limit)
    ).scalars().all()

    # Множество избранных id текущего пользователя — чтобы пометить карточки.
    favorite_ids = set(
        str(pid) for pid in db.execute(
            select(Favorite.post_id).where(Favorite.user_id == current_user.id)
        ).scalars().all()
    )

    items = [
        _serialize_post(post, current_user.id, is_favorited=str(post.id) in favorite_ids)
        for post in posts
    ]

    return {"items": items}


@router.get("/topics")
def get_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список тем (топиков) из доступных пользователю постов, с количеством."""
    rows = db.execute(
        select(Post.content_json["topic"].astext)
        .where(Post.status == "active")
        .where(Post.type == "post")
        .where(_visibility_clause(current_user.id))
    ).scalars().all()

    counts = {}
    for topic in rows:
        topic = (topic or "").strip()
        if not topic:
            continue
        counts[topic] = counts.get(topic, 0) + 1

    items = [
        {"topic": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    ]
    return {"items": items}


@router.get("/search")
def search_posts(
    q: str,
    topic: str | None = None,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Нечёткий (похожий) поиск по постам через pg_trgm (триграммная близость).

    Находит записи даже при опечатках и частичных совпадениях, ранжируя по
    близости. `%` использует триграммный GIN-индекс; ILIKE ловит подстроки.
    """
    q = (q or "").strip()
    if not q:
        return {"items": [], "query": ""}

    limit = max(1, min(limit, 100))

    ql = q.lower()
    # word_similarity сравнивает запрос с ближайшим СЛОВОМ текста, а не со всей
    # строкой целиком — поэтому одно слово в длинной записи и опечатки находятся.
    rank = func.word_similarity(ql, Post.search_text)

    query = (
        select(Post, rank.label("rank"))
        .where(Post.status == "active")
        .where(Post.type == "post")
        .where(
            or_(
                # search_text %> ql  ≡  word_similarity(ql, search_text) >= порог
                Post.search_text.op("%>")(ql),
                Post.search_text.ilike(f"%{ql}%"),
            )
        )
        .where(_visibility_clause(current_user.id))
    )

    if topic:
        query = query.where(Post.content_json["topic"].astext == topic)

    rows = db.execute(
        query.order_by(rank.desc(), Post.created_at.desc()).limit(limit)
    ).all()

    favorite_ids = set(
        str(pid) for pid in db.execute(
            select(Favorite.post_id).where(Favorite.user_id == current_user.id)
        ).scalars().all()
    )

    items = [
        _serialize_post(post, current_user.id, is_favorited=str(post.id) in favorite_ids)
        for post, _rank in rows
    ]
    return {"items": items, "query": q}


@router.post("/posts", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post_data = payload.model_dump()
    post_data["type"] = "post"
    post_data["user_id"] = current_user.id
    post_data["parent_id"] = None
    print(post_data)
    post = Post(**post_data)
    print(post)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.post("/posts/{post_id}/reply", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_reply(
    post_id: UUID,
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent_post = db.execute(
        select(Post).where(Post.id == post_id).where(Post.type == "post")
    ).scalar_one_or_none()

    if not parent_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent post not found",
        )

    post_data = payload.model_dump()
    post_data["type"] = "post"
    post_data["user_id"] = current_user.id
    post_data["parent_id"] = parent_post.id

    post = Post(**post_data)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get("/posts", response_model=List[PostRead])
def list_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts = db.execute(
        select(Post)
        .where(Post.type == "post")
        .where(_visibility_clause(current_user.id))
        .order_by(Post.created_at.desc())
    ).scalars().all()
    return posts


@router.get("/posts/{post_id}", response_model=PostRead)
def get_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Доступ строго по правилам видимости: знать id недостаточно.
    post = db.execute(
        select(Post)
        .where(Post.id == post_id)
        .where(_visibility_clause(current_user.id))
    ).scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    return post


@router.patch("/posts/{post_id}", response_model=PostRead)
def update_post(
    post_id: UUID,
    payload: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.execute(
        select(Post).where(Post.id == post_id)
    ).scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own posts",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    db.commit()
    db.refresh(post)
    return post


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.execute(
        select(Post).where(Post.id == post_id)
    ).scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts",
        )

    db.delete(post)
    db.commit()
    return None


@router.get("/posts/{post_id}/children", response_model=List[PostRead])
def get_post_children(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    children = db.execute(
        select(Post)
        .where(Post.parent_id == post_id)
        .where(_visibility_clause(current_user.id))
        .order_by(Post.created_at.asc())
    ).scalars().all()

    return children


@router.get("/posts/{post_id}/thread")
def get_post_thread(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Вся ветка записи: корень + все продолжения (рекурсивно), плоским списком.

    Фронт строит из него дерево по parent_id. Возвращает только доступные
    пользователю записи (фильтр видимости).
    """
    # 1. Поднимаемся к корню ветки (запись без родителя).
    root_id = db.execute(
        text(
            """
            WITH RECURSIVE ancestors AS (
                SELECT id, parent_id FROM posts WHERE id = :pid
                UNION ALL
                SELECT p.id, p.parent_id FROM posts p
                JOIN ancestors a ON p.id = a.parent_id
            )
            SELECT id FROM ancestors WHERE parent_id IS NULL LIMIT 1
            """
        ),
        {"pid": str(post_id)},
    ).scalar()
    root_id = root_id or post_id

    # 2. Собираем всё поддерево от корня вниз.
    subtree_ids = db.execute(
        text(
            """
            WITH RECURSIVE subtree AS (
                SELECT id FROM posts WHERE id = :rid
                UNION ALL
                SELECT p.id FROM posts p
                JOIN subtree s ON p.parent_id = s.id
            )
            SELECT id FROM subtree
            """
        ),
        {"rid": str(root_id)},
    ).scalars().all()

    if not subtree_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    posts = db.execute(
        select(Post)
        .where(Post.id.in_(subtree_ids))
        .where(_visibility_clause(current_user.id))
        .order_by(Post.created_at.asc())
    ).scalars().all()

    favorite_ids = set(
        str(pid) for pid in db.execute(
            select(Favorite.post_id).where(Favorite.user_id == current_user.id)
        ).scalars().all()
    )

    items = [
        _serialize_post(post, current_user.id, is_favorited=str(post.id) in favorite_ids)
        for post in posts
    ]

    return {"root_id": str(root_id), "items": items}