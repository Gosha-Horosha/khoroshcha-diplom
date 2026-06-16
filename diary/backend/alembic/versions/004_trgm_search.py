"""Fuzzy (trigram) search on posts

Revision ID: 004
Revises: 003
Create Date: 2026-06-14 00:00:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


# Простой текст для нечёткого поиска (lower + склейка значимых полей).
# Генерируемая колонка → пересчитывается автоматически при INSERT/UPDATE.
SEARCH_TEXT_EXPRESSION = (
    "lower("
    "coalesce(display_name, '') || ' ' || "
    "coalesce(content_json->>'title', '') || ' ' || "
    "coalesce(content_json->>'text', '') || ' ' || "
    "coalesce(content_json->>'topic', ''))"
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        f"ALTER TABLE posts ADD COLUMN search_text text "
        f"GENERATED ALWAYS AS ({SEARCH_TEXT_EXPRESSION}) STORED"
    )
    # GIN + gin_trgm_ops — даёт быстрый похожий (similarity / ILIKE) поиск.
    op.execute(
        "CREATE INDEX ix_posts_search_text_trgm "
        "ON posts USING gin (search_text gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_posts_search_text_trgm")
    op.execute("ALTER TABLE posts DROP COLUMN IF EXISTS search_text")
