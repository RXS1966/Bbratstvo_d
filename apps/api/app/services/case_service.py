"""Сервис кейсов (PostgreSQL)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.case import CaseModel
from app.services import diagnostic_service
from app.services.evaluation_service import evaluate_case_answer


def list_cases(db: Session, owner_username: str) -> list[CaseModel]:
    stmt = (
        select(CaseModel)
        .options(joinedload(CaseModel.diagnostic_session))
        .where(CaseModel.owner_username == owner_username)
        .order_by(CaseModel.updated_at.desc())
    )
    return list(db.scalars(stmt).all())


def get_case(
    db: Session,
    case_id: str,
    owner_username: str,
) -> CaseModel | None:
    stmt = (
        select(CaseModel)
        .options(joinedload(CaseModel.diagnostic_session))
        .where(
            CaseModel.id == case_id,
            CaseModel.owner_username == owner_username,
        )
    )
    row = db.scalars(stmt).first()
    if row is None or row.owner_username != owner_username:
        return None
    return row


def create_case(
    db: Session,
    owner_username: str,
    diagnostic_session_id: str,
    title: str,
    brief: str,
    materials: str,
) -> CaseModel | None:
    diagnostic = diagnostic_service.get_session(
        db,
        diagnostic_session_id,
        owner_username,
    )
    if diagnostic is None or diagnostic.status != "completed":
        return None

    now = datetime.now(timezone.utc)
    row = CaseModel(
        id=str(uuid.uuid4()),
        owner_username=owner_username,
        diagnostic_session_id=diagnostic_session_id,
        title=title.strip(),
        brief=brief.strip(),
        materials=materials.strip(),
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_answer(
    db: Session,
    case_id: str,
    owner_username: str,
    user_answer: str,
) -> CaseModel | None:
    row = get_case(db, case_id, owner_username)
    if row is None or row.status != "draft":
        return None
    row.user_answer = user_answer.strip()
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def submit_case(
    db: Session,
    case_id: str,
    owner_username: str,
    user_answer: str,
) -> CaseModel | None:
    row = get_case(db, case_id, owner_username)
    if row is None or row.status != "draft":
        return None
    if not user_answer.strip():
        return None

    row.user_answer = user_answer.strip()
    diagnostic = row.diagnostic_session
    role_title = diagnostic.role_title if diagnostic else ""
    context = diagnostic.context if diagnostic else ""
    kpi_notes = diagnostic.kpi_notes if diagnostic else ""
    score, feedback = evaluate_case_answer(
        role_title=role_title,
        context=context,
        kpi_notes=kpi_notes,
        case_title=row.title,
        case_brief=row.brief,
        materials=row.materials,
        user_answer=row.user_answer,
    )
    row.status = "submitted"
    row.score = score
    row.feedback = feedback
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row
