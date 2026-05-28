from app.db.session import SessionLocal
from app.db.models import User, Post


def run():
    db = SessionLocal()
    try:
        # ---------- USERS ----------
        user1 = User(
            email="user1@example.com",
            username="user1",
            password_hash="fake_hashed_password_1",
            role="user",
        )

        user2 = User(
            email="user2@example.com",
            username="user2",
            password_hash="fake_hashed_password_2",
            role="user",
        )

        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)

        # ---------- POSTS: USER 1 ----------
        u1_root = Post(
            user_id=user1.id,
            parent_id=None,
            type="user",
            display_name="User1 Root",
            visibility_mode="private",
            status="active",
            content_json={
                "title": "User1 root",
                "text": "Корневой узел первого пользователя"
            },
        )
        db.add(u1_root)
        db.commit()
        db.refresh(u1_root)

        u1_post_1 = Post(
            user_id=user1.id,
            parent_id=u1_root.id,
            type="post",
            display_name="User1 Post 1",
            visibility_mode="private",
            status="active",
            content_json={
                "title": "Post 1",
                "text": "Пост первого пользователя на юзера"
            },
        )
        u1_post_2 = Post(
            user_id=user1.id,
            parent_id=u1_root.id,
            type="post",
            display_name="User1 Post 2",
            visibility_mode="public",
            status="active",
            content_json={
                "title": "Post 2",
                "text": "Ещё один пост первого пользователя на юзера"
            },
        )

        db.add_all([u1_post_1, u1_post_2])
        db.commit()
        db.refresh(u1_post_1)
        db.refresh(u1_post_2)

        u1_post_1_1 = Post(
            user_id=user1.id,
            parent_id=u1_post_1.id,
            type="post",
            display_name="User1 Post 1.1",
            visibility_mode="friends",
            status="active",
            content_json={
                "title": "Post 1.1",
                "text": "Пост первого пользователя на пост"
            },
        )
        db.add(u1_post_1_1)
        db.commit()
        db.refresh(u1_post_1_1)

        u1_post_1_1_1 = Post(
            user_id=user1.id,
            parent_id=u1_post_1_1.id,
            type="post",
            display_name="User1 Post 1.1.1",
            visibility_mode="close_friends",
            status="active",
            content_json={
                "title": "Post 1.1.1",
                "text": "Третий уровень вложенности у первого пользователя"
            },
        )
        u1_post_3 = Post(
            user_id=user1.id,
            parent_id=u1_root.id,
            type="post",
            display_name="User1 Post 3",
            visibility_mode="topic",
            status="archived",
            content_json={
                "title": "Post 3",
                "text": "Архивный пост первого пользователя"
            },
        )

        db.add_all([u1_post_1_1_1, u1_post_3])
        db.commit()
        db.refresh(u1_post_1_1_1)
        db.refresh(u1_post_3)

        # ---------- POSTS: USER 2 ----------
        u2_root = Post(
            user_id=user2.id,
            parent_id=None,
            type="user",
            display_name="User2 Root",
            visibility_mode="private",
            status="active",
            content_json={
                "title": "User2 root",
                "text": "Корневой узел второго пользователя"
            },
        )
        db.add(u2_root)
        db.commit()
        db.refresh(u2_root)

        u2_post_1 = Post(
            user_id=user2.id,
            parent_id=u2_root.id,
            type="post",
            display_name="User2 Post 1",
            visibility_mode="public",
            status="active",
            content_json={
                "title": "Post 1",
                "text": "Пост второго пользователя на юзера"
            },
        )
        u2_post_2 = Post(
            user_id=user2.id,
            parent_id=u2_root.id,
            type="post",
            display_name="User2 Post 2",
            visibility_mode="friends",
            status="active",
            content_json={
                "title": "Post 2",
                "text": "Второй пост второго пользователя на юзера"
            },
        )

        db.add_all([u2_post_1, u2_post_2])
        db.commit()
        db.refresh(u2_post_1)
        db.refresh(u2_post_2)

        u2_post_1_1 = Post(
            user_id=user2.id,
            parent_id=u2_post_1.id,
            type="post",
            display_name="User2 Post 1.1",
            visibility_mode="private",
            status="active",
            content_json={
                "title": "Post 1.1",
                "text": "Пост второго пользователя на пост"
            },
        )
        u2_post_2_1 = Post(
            user_id=user2.id,
            parent_id=u2_post_2.id,
            type="post",
            display_name="User2 Post 2.1",
            visibility_mode="public",
            status="deleted",
            content_json={
                "title": "Post 2.1",
                "text": "Удалённая ветка второго пользователя"
            },
        )

        db.add_all([u2_post_1_1, u2_post_2_1])
        db.commit()
        db.refresh(u2_post_1_1)
        db.refresh(u2_post_2_1)

        u2_post_1_1_1 = Post(
            user_id=user2.id,
            parent_id=u2_post_1_1.id,
            type="post",
            display_name="User2 Post 1.1.1",
            visibility_mode="close_friends",
            status="active",
            content_json={
                "title": "Post 1.1.1",
                "text": "Третий уровень вложенности у второго пользователя"
            },
        )
        db.add(u2_post_1_1_1)
        db.commit()
        db.refresh(u2_post_1_1_1)

        print("Seed completed successfully")
        print("User1 ID:", user1.id)
        print("User2 ID:", user2.id)
        print("User1 root post ID:", u1_root.id)
        print("User2 root post ID:", u2_root.id)

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()