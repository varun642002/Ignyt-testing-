"""Apple StoreKit entitlement: users.apple_original_transaction_id

A SEPARATE column rather than reusing play_purchase_token, for two reasons that are both hard
rather than stylistic:

  * a StoreKit JWS is 1-4 KB and play_purchase_token is String(512), so it would not fit;
  * the JWS is re-issued on every renewal, so it cannot answer "has another account already
    claimed this subscription". originalTransactionId is stable for the life of the
    subscription and is the identity Apple itself keys on.

Indexed because the replay check in routes_billing looks users up BY this value on every
verify -- an unindexed lookup there is a full table scan on the hot path of a purchase.

Nullable with no default and no backfill: every existing row is a Play or free user, and NULL
is the correct answer for "this account has no Apple subscription".

Revision ID: 0004_apple_entitlement
Revises: 0003_play_entitlement
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_apple_entitlement"
down_revision = "0003_play_entitlement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("apple_original_transaction_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_users_apple_original_transaction_id",
        "users",
        ["apple_original_transaction_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_apple_original_transaction_id", table_name="users")
    op.drop_column("users", "apple_original_transaction_id")
