"""
Интерактивный скрипт заполнения базы данных.

Запуск внутри контейнера:
    docker exec -it diary-backend-1 python app/seed_data.py

Запуск локально (если DATABASE_URL задан в .env):
    python app/seed_data.py

Что делает:
  1. Предлагает заполнить пользователей (вы вводите данные прямо в консоли).
  2. Для каждого пользователя предлагает добавить посты.
  3. Спрашивает, нужно ли создать дружбы между созданными пользователями.

Уже существующие email/username пропускаются без ошибки.
"""

import sys
from typing import Optional

from sqlalchemy import select

from app.db.session import SessionLocal
from app.db.models import User, Post, Friendship
from app.core.security import get_password_hash


# ---------- helpers ----------

def ask(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    return value if value else default


def ask_int(prompt: str, default: int) -> int:
    raw = ask(prompt, str(default))
    try:
        return int(raw)
    except ValueError:
        return default


def ask_choice(prompt: str, options: list[str], default: str) -> str:
    formatted = "/".join(options)
    raw = ask(f"{prompt} ({formatted})", default).lower()
    return raw if raw in options else default


def separator(title: str = "") -> None:
    line = "─" * 50
    if title:
        print(f"\n{line}\n  {title}\n{line}")
    else:
        print(line)


# ---------- создание пользователя ----------

def create_user(db) -> Optional[User]:
    separator("Новый пользователь")

    email = ask("Email")
    if not email:
        print("  Email пустой — пропускаем.")
        return None

    existing = db.execute(
        select(User).where(User.email == email)
    ).scalar_one_or_none()
    if existing:
        print(f"  Пользователь {email} уже существует — используем его.")
        return existing

    username = ask("Username", email.split("@")[0])
    password = ask("Пароль", "password123")

    user = User(
        email=email,
        username=username,
        password_hash=get_password_hash(password),
        role="user",
    )
    db.add(user)
    db.flush()

    # Корневой пост-профиль пользователя.
    user_post = Post(
        user_id=user.id,
        parent_id=None,
        type="user",
        display_name=username,
        visibility_mode="private",
        status="active",
        content_json={"title": username, "text": "", "excerpt": ""},
    )
    db.add(user_post)
    db.flush()

    print(f"  ✓ Пользователь {username} <{email}> создан. Пароль: {password}")
    return user


# ---------- создание постов ----------

VISIBILITY_OPTIONS = ["private", "friends", "close_friends", "public", "topic"]


def create_posts_for_user(db, user: User) -> None:
    separator(f"Посты для {user.username}")

    count = ask_int("Сколько постов создать", 3)
    if count <= 0:
        return

    for i in range(1, count + 1):
        print(f"\n  Пост {i}/{count}")

        title = ask("  Заголовок", f"Запись {i} от {user.username}")
        text = ask("  Текст", f"Содержимое записи {i}. Написано от имени {user.username}.")
        topic = ask("  Топик (необязательно)", "")
        visibility = ask_choice(
            "  Видимость",
            VISIBILITY_OPTIONS,
            "public"
        )

        post = Post(
            user_id=user.id,
            parent_id=None,
            type="post",
            display_name=title,
            visibility_mode=visibility,
            status="active",
            content_json={
                "title": title,
                "text": text,
                "topic": topic,
                "excerpt": text[:180],
            },
        )
        db.add(post)
        db.flush()
        print(f"  ✓ Пост «{title}» [{visibility}] добавлен.")


# ---------- создание дружб ----------

def create_friendships(db, users: list[User]) -> None:
    if len(users) < 2:
        return

    separator("Дружбы между пользователями")
    print("  Созданные пользователи:")
    for idx, u in enumerate(users):
        print(f"    {idx + 1}. {u.username} <{u.email}>")

    print("\n  Введите пары (например: 1 2) или нажмите Enter для завершения.")
    print("  Укажите через пробел: номер1 номер2 [close|friends] (группа необязательна)")

    while True:
        raw = input("  Пара: ").strip()
        if not raw:
            break

        parts = raw.split()
        if len(parts) < 2:
            print("  Нужно минимум два номера.")
            continue

        try:
            a_idx = int(parts[0]) - 1
            b_idx = int(parts[1]) - 1
        except ValueError:
            print("  Неверный формат — введите числа.")
            continue

        if not (0 <= a_idx < len(users) and 0 <= b_idx < len(users)):
            print("  Номер вне диапазона.")
            continue

        if a_idx == b_idx:
            print("  Нельзя подружить пользователя с самим собой.")
            continue

        user_a = users[a_idx]
        user_b = users[b_idx]

        group_raw = parts[2].lower() if len(parts) > 2 else "friends"
        is_close = group_raw == "close"

        # Проверяем, нет ли уже такой дружбы.
        from sqlalchemy import and_, or_
        existing = db.execute(
            select(Friendship).where(
                or_(
                    and_(Friendship.user_id == user_a.id, Friendship.friend_id == user_b.id),
                    and_(Friendship.user_id == user_b.id, Friendship.friend_id == user_a.id),
                )
            )
        ).scalar_one_or_none()

        if existing:
            print(f"  Дружба {user_a.username} ↔ {user_b.username} уже существует.")
            continue

        friendship = Friendship(
            user_id=user_a.id,
            friend_id=user_b.id,
            status="accepted",
            is_close=is_close,
        )
        db.add(friendship)
        db.flush()

        group_label = "близкие друзья" if is_close else "друзья"
        print(f"  ✓ {user_a.username} ↔ {user_b.username} [{group_label}]")


# ---------- быстрое заполнение ----------

def quick_seed(db) -> list[User]:
    """Создаёт набор тестовых пользователей без вопросов."""
    separator("Быстрое заполнение (тестовые данные)")

    USERS = [
        {"email": "alice@example.com", "username": "alice", "password": "alice123"},
        {"email": "bob@example.com",   "username": "bob",   "password": "bob123"},
        {"email": "carol@example.com", "username": "carol", "password": "carol123"},
    ]

    POSTS = [
        {"title": "Первые мысли",       "text": "Это мой первый пост в дневнике.", "topic": "дневник", "visibility": "public"},
        {"title": "О работе",           "text": "Сегодня был продуктивный день.",  "topic": "работа",  "visibility": "friends"},
        {"title": "Личное",             "text": "Только для меня.",                "topic": "",        "visibility": "private"},
        {"title": "Идея проекта",       "text": "Хочу сделать что-то крутое.",     "topic": "идеи",    "visibility": "public"},
        {"title": "Что читаю сейчас",   "text": "Дочитываю «Мастера и Маргариту».", "topic": "книги", "visibility": "close_friends"},
    ]

    created_users = []

    for u_data in USERS:
        existing = db.execute(
            select(User).where(User.email == u_data["email"])
        ).scalar_one_or_none()

        if existing:
            print(f"  Пользователь {u_data['email']} уже есть — пропускаем.")
            created_users.append(existing)
            continue

        user = User(
            email=u_data["email"],
            username=u_data["username"],
            password_hash=get_password_hash(u_data["password"]),
            role="user",
        )
        db.add(user)
        db.flush()

        db.add(Post(
            user_id=user.id,
            parent_id=None,
            type="user",
            display_name=u_data["username"],
            visibility_mode="private",
            status="active",
            content_json={"title": u_data["username"], "text": "", "excerpt": ""},
        ))

        import random
        posts_sample = random.sample(POSTS, k=min(3, len(POSTS)))
        for p in posts_sample:
            db.add(Post(
                user_id=user.id,
                parent_id=None,
                type="post",
                display_name=p["title"],
                visibility_mode=p["visibility"],
                status="active",
                content_json={
                    "title": p["title"],
                    "text": p["text"],
                    "topic": p["topic"],
                    "excerpt": p["text"][:180],
                },
            ))

        db.flush()
        print(f"  ✓ {u_data['username']} <{u_data['email']}> — пароль: {u_data['password']}")
        created_users.append(user)

    # Дружбы: alice-bob (обычные), bob-carol (близкие)
    from sqlalchemy import and_, or_
    pairs = [
        (created_users[0], created_users[1], False),
        (created_users[1], created_users[2], True),
    ]
    for u_a, u_b, is_close in pairs:
        existing = db.execute(
            select(Friendship).where(
                or_(
                    and_(Friendship.user_id == u_a.id, Friendship.friend_id == u_b.id),
                    and_(Friendship.user_id == u_b.id, Friendship.friend_id == u_a.id),
                )
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(Friendship(
                user_id=u_a.id,
                friend_id=u_b.id,
                status="accepted",
                is_close=is_close,
            ))
            group = "близкие" if is_close else "друзья"
            print(f"  ✓ {u_a.username} ↔ {u_b.username} [{group}]")

    db.flush()
    return created_users


# ---------- main ----------

def main() -> None:
    print("\n╔══════════════════════════════════════════════╗")
    print("║       Night Archive — заполнение базы        ║")
    print("╚══════════════════════════════════════════════╝\n")

    mode = ask_choice(
        "Режим",
        ["quick", "manual"],
        "quick"
    )

    db = SessionLocal()
    try:
        created_users: list[User] = []

        if mode == "quick":
            created_users = quick_seed(db)
        else:
            # Интерактивный режим.
            while True:
                user = create_user(db)
                if user:
                    created_users.append(user)

                    add_posts = ask_choice("Добавить посты для этого пользователя?", ["y", "n"], "y")
                    if add_posts == "y":
                        create_posts_for_user(db, user)

                another = ask_choice("\nДобавить ещё одного пользователя?", ["y", "n"], "n")
                if another != "y":
                    break

            if len(created_users) >= 2:
                add_fr = ask_choice("\nСоздать дружбы между пользователями?", ["y", "n"], "y")
                if add_fr == "y":
                    create_friendships(db, created_users)

        db.commit()
        separator()
        print(f"✓ Готово! Создано/найдено пользователей: {len(created_users)}")
        for u in created_users:
            print(f"    • {u.username} <{u.email}>")
        print()

    except KeyboardInterrupt:
        db.rollback()
        print("\n\nПрервано. Изменения отменены.")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        print(f"\nОшибка: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
