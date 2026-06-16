"""Add email verification flag to users

Revision ID: 005
Revises: 004
Create Date: 2026-06-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Существующие аккаунты считаем подтверждёнными, чтобы не залочить вход.
    op.execute("UPDATE users SET is_verified = true")


def downgrade() -> None:
    op.drop_column("users", "is_verified")
