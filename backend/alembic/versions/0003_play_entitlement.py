"""Play entitlement columns on users.

is_premium already existed but nothing ever wrote it — the client asked Play and kept the
answer, which is fine for hiding a button and worthless as a boundary. These columns are what
lets the SERVER decide: the receipt it verified, when it last asked Google, and when the
subscription lapses.

premium_expires_at is the important one. Without Real-Time Developer Notifications a
cancellation is invisible until the next check, so entitlement is DERIVED from this on every
read rather than stored as a boolean set once and trusted forever.

Revision ID: 0003_play_entitlement
Revises: 0002_ai_food
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_play_entitlement"
down_revision = "0002_ai_food"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("play_purchase_token", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("premium_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("premium_last_checked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("premium_source", sa.String(length=32), nullable=True))
    # Indexed because verify() looks a token up across ALL users on every call, to stop one
    # purchase being pasted into several accounts. Without the index that is a table scan on
    # the hot path of the thing people pay for.
    op.create_index("ix_users_play_purchase_token", "users", ["play_purchase_token"])


def downgrade() -> None:
    op.drop_index("ix_users_play_purchase_token", table_name="users")
    op.drop_column("users", "premium_source")
    op.drop_column("users", "premium_last_checked_at")
    op.drop_column("users", "premium_expires_at")
    op.drop_column("users", "play_purchase_token")
