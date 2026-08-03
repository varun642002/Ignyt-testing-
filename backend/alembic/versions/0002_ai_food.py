"""AI food scanning: community_foods, ai_scan_usage, users.is_premium

Revision ID: 0002_ai_food
Revises: 0001_users
Create Date: 2026-07-29 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_ai_food"
down_revision = "0001_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Entitlement has to be server-side. A client-asserted "I am premium" is a request, not a
    # fact, so the free/premium gate reads this column and nothing else.
    op.add_column(
        "users",
        sa.Column("is_premium", sa.Boolean(), server_default="0", nullable=False),
    )

    # One row per user per UTC day. The reset is implicit — a new day simply has no row — so
    # there is no scheduled job to run and nothing to go wrong if the service is down at
    # midnight.
    op.create_table(
        "ai_scan_usage",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "day", name="uq_ai_scan_usage_user_day"),
    )
    op.create_index("ix_ai_scan_usage_user_id", "ai_scan_usage", ["user_id"])

    # Foods an AI estimated and a user confirmed. Values are per 100 g, like every other food
    # record in the product, so no special-case serving maths is needed anywhere.
    op.create_table(
        "community_foods",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("search_key", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("calories", sa.Float(), nullable=False),
        sa.Column("protein", sa.Float(), nullable=True),
        sa.Column("carbs", sa.Float(), nullable=True),
        sa.Column("fat", sa.Float(), nullable=True),
        sa.Column("fibre", sa.Float(), nullable=True),
        sa.Column("sugar", sa.Float(), nullable=True),
        sa.Column("sodium", sa.Float(), nullable=True),
        sa.Column("serving_grams", sa.Float(), nullable=True),
        sa.Column("serving_label", sa.String(length=120), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="ai_confirmed"),
        sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("confirmations", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # The hot path: every scan does at least one lookup on this.
    op.create_index("ix_community_foods_search_key", "community_foods", ["search_key"])


def downgrade() -> None:
    op.drop_index("ix_community_foods_search_key", table_name="community_foods")
    op.drop_table("community_foods")
    op.drop_index("ix_ai_scan_usage_user_id", table_name="ai_scan_usage")
    op.drop_table("ai_scan_usage")
    op.drop_column("users", "is_premium")
