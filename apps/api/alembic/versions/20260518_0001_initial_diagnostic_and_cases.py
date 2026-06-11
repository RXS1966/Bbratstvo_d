"""initial diagnostic_sessions and cases

Revision ID: 20260518_0001
Revises:
Create Date: 2026-05-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260518_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "diagnostic_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_username", sa.String(length=64), nullable=False),
        sa.Column("role_title", sa.String(length=128), nullable=False),
        sa.Column("context", sa.Text(), nullable=False),
        sa.Column("kpi_notes", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_diagnostic_sessions_owner_username",
        "diagnostic_sessions",
        ["owner_username"],
    )
    op.create_index(
        "ix_diagnostic_sessions_status",
        "diagnostic_sessions",
        ["status"],
    )

    op.create_table(
        "cases",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_username", sa.String(length=64), nullable=False),
        sa.Column("diagnostic_session_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("brief", sa.Text(), nullable=False),
        sa.Column("materials", sa.Text(), nullable=False),
        sa.Column("user_answer", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["diagnostic_session_id"],
            ["diagnostic_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cases_owner_username", "cases", ["owner_username"])
    op.create_index(
        "ix_cases_diagnostic_session_id",
        "cases",
        ["diagnostic_session_id"],
    )
    op.create_index("ix_cases_status", "cases", ["status"])


def downgrade() -> None:
    op.drop_index("ix_cases_status", table_name="cases")
    op.drop_index("ix_cases_diagnostic_session_id", table_name="cases")
    op.drop_index("ix_cases_owner_username", table_name="cases")
    op.drop_table("cases")
    op.drop_index("ix_diagnostic_sessions_status", table_name="diagnostic_sessions")
    op.drop_index(
        "ix_diagnostic_sessions_owner_username",
        table_name="diagnostic_sessions",
    )
    op.drop_table("diagnostic_sessions")
