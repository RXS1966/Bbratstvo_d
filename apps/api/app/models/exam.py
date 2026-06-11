from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.diagnostic import DiagnosticSessionModel


class ExamSessionModel(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_username: Mapped[str] = mapped_column(String(64), index=True)
    diagnostic_session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("diagnostic_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(256))
    status: Mapped[str] = mapped_column(String(20), index=True)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=30)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    overall_score: Mapped[int | None] = mapped_column(nullable=True)
    overall_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    diagnostic_session: Mapped[DiagnosticSessionModel] = relationship(
        "DiagnosticSessionModel",
    )
    questions: Mapped[list["ExamQuestionModel"]] = relationship(
        "ExamQuestionModel",
        back_populates="exam_session",
    )


class ExamQuestionModel(Base):
    __tablename__ = "exam_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    exam_session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer)
    question_text: Mapped[str] = mapped_column(Text)
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    score: Mapped[int | None] = mapped_column(nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    exam_session: Mapped[ExamSessionModel] = relationship(
        "ExamSessionModel",
        back_populates="questions",
    )
