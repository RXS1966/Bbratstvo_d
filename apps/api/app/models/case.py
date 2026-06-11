from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.diagnostic import DiagnosticSessionModel


class CaseModel(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_username: Mapped[str] = mapped_column(String(64), index=True)
    diagnostic_session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("diagnostic_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(256))
    brief: Mapped[str] = mapped_column(Text)
    materials: Mapped[str] = mapped_column(Text, default="")
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), index=True)
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

    diagnostic_session: Mapped[DiagnosticSessionModel] = relationship(
        "DiagnosticSessionModel",
        back_populates="cases",
    )
