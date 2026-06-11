"""exam_sessions and exam_questions

Revision ID: 20260525_0002
Revises: 20260518_0001
Create Date: 2026-05-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260525_0002"
down_revision: Union[str, None] = "20260518_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exam_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_username", sa.String(length=64), nullable=False),
        sa.Column("diagnostic_session_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("time_limit_minutes", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column("overall_feedback", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["diagnostic_session_id"],
            ["diagnostic_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_exam_sessions_owner_username",
        "exam_sessions",
        ["owner_username"],
    )
    op.create_index(
        "ix_exam_sessions_diagnostic_session_id",
        "exam_sessions",
        ["diagnostic_session_id"],
    )
    op.create_index("ix_exam_sessions_status", "exam_sessions", ["status"])

    op.create_table(
        "exam_questions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("exam_session_id", sa.String(length=36), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
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
            ["exam_session_id"],
            ["exam_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_exam_questions_exam_session_id",
        "exam_questions",
        ["exam_session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_exam_questions_exam_session_id", table_name="exam_questions")
    op.drop_table("exam_questions")
    op.drop_index("ix_exam_sessions_status", table_name="exam_sessions")
    op.drop_index(
        "ix_exam_sessions_diagnostic_session_id",
        table_name="exam_sessions",
    )
    op.drop_index("ix_exam_sessions_owner_username", table_name="exam_sessions")
    op.drop_table("exam_sessions")
