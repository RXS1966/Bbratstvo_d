"""Сервис диагностических срезов (PostgreSQL)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.diagnostic import DiagnosticSessionModel

RESULT_TEXT = (
    "Срез завершён: зафиксирован контекст роли и KPI. "
    "Можно переходить к кейсам."
)


def list_sessions(
    db: Session,
    owner_username: str,
    status: str | None = None,
) -> list[DiagnosticSessionModel]:
    stmt = select(DiagnosticSessionModel).where(
        DiagnosticSessionModel.owner_username == owner_username
    )
    if status:
        stmt = stmt.where(DiagnosticSessionModel.status == status)
    stmt = stmt.order_by(DiagnosticSessionModel.updated_at.desc())
    return list(db.scalars(stmt).all())


def get_session(
    db: Session,
    session_id: str,
    owner_username: str,
) -> DiagnosticSessionModel | None:
    row = db.get(DiagnosticSessionModel, session_id)
    if row is None or row.owner_username != owner_username:
        return None
    return row


def create_session(
    db: Session,
    owner_username: str,
    role_title: str,
    context: str,
    kpi_notes: str,
) -> DiagnosticSessionModel:
    now = datetime.now(timezone.utc)
    row = DiagnosticSessionModel(
        id=str(uuid.uuid4()),
        owner_username=owner_username,
        role_title=role_title.strip(),
        context=context.strip(),
        kpi_notes=kpi_notes.strip(),
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def start_session(
    db: Session,
    session_id: str,
    owner_username: str,
) -> DiagnosticSessionModel | None:
    row = get_session(db, session_id, owner_username)
    if row is None or row.status != "draft":
        return None
    row.status = "running"
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def complete_session(
    db: Session,
    session_id: str,
    owner_username: str,
) -> DiagnosticSessionModel | None:
    row = get_session(db, session_id, owner_username)
    if row is None or row.status != "running":
        return None
    row.status = "completed"
    row.result_summary = RESULT_TEXT
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row
