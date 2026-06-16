"""Add full-text search vector on posts

Revision ID: 003
Revises: 002
Create Date: 2026-06-13 00:30:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


# Генерируемая колонка tsvector: автоматически пересчитывается при INSERT/UPDATE.
# Используем явный конфиг 'russian' (IMMUTABLE) — обязательно для GENERATED-колонки.
SEARCH_EXPRESSION = (
    "to_tsvector('russian', "
    "coalesce(display_name, '') || ' ' || "
    "coalesce(content_json->>'title', '') || ' ' || "
    "coalesce(content_json->>'text', '') || ' ' || "
    "coalesce(content_json->>'topic', ''))"
)


def upgrade() -> None:
    op.execute(
        f"ALTER TABLE posts ADD COLUMN search_vector tsvector "
        f"GENERATED ALWAYS AS ({SEARCH_EXPRESSION}) STORED"
    )
    op.execute(
        "CREATE INDEX ix_posts_search_vector ON posts USING gin (search_vector)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_posts_search_vector")
    op.execute("ALTER TABLE posts DROP COLUMN IF EXISTS search_vector")
