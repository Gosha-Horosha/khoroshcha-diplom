"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("visibility_mode", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("content_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("type IN ('user', 'post')", name="posts_type_check"),
        sa.CheckConstraint(
            "visibility_mode IS NULL OR visibility_mode IN ('private', 'friends', 'close_friends', 'public', 'topic')",
            name="posts_visibility_check",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'archived', 'deleted')",
            name="posts_status_check",
        ),
    )
    op.create_index("ix_posts_user_id", "posts", ["user_id"], unique=False)
    op.create_index("ix_posts_parent_id", "posts", ["parent_id"], unique=False)
    op.create_index("ix_posts_type", "posts", ["type"], unique=False)
    op.create_index("ix_posts_visibility_mode", "posts", ["visibility_mode"], unique=False)
    op.create_index("ix_posts_status", "posts", ["status"], unique=False)

    op.create_table(
        "friendships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("friend_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("is_close", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["friend_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'rejected', 'blocked')",
            name="friendships_status_check",
        ),
        sa.CheckConstraint(
            "user_id <> friend_id",
            name="friendships_not_same_check",
        ),
    )
    op.create_index("ix_friendships_user_id", "friendships", ["user_id"], unique=False)
    op.create_index("ix_friendships_friend_id", "friendships", ["friend_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_friendships_friend_id", table_name="friendships")
    op.drop_index("ix_friendships_user_id", table_name="friendships")
    op.drop_table("friendships")

    op.drop_index("ix_posts_status", table_name="posts")
    op.drop_index("ix_posts_visibility_mode", table_name="posts")
    op.drop_index("ix_posts_type", table_name="posts")
    op.drop_index("ix_posts_parent_id", table_name="posts")
    op.drop_index("ix_posts_user_id", table_name="posts")
    op.drop_table("posts")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")