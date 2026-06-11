"""Сервис экзаменатора (PostgreSQL)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.case import CaseModel
from app.models.exam import ExamQuestionModel, ExamSessionModel
from app.services import diagnostic_service
from app.services.evaluation_service import (
    evaluate_exam_session_batch,
    generate_exam_questions,
)

DEFAULT_TIME_LIMIT_MINUTES = 30

QUESTION_TEMPLATES = (
    (
        "Опишите ваш подход к ключевой задаче по роли «{role}» "
        "в контексте: {context_short}"
    ),
    (
        "Какие KPI вы бы отслеживали для этой роли и как измеряли "
        "прогресс в первые 90 дней?"
    ),
    (
        "Как вы действуете при конфликте приоритетов в команде? "
        "Приведите пример из практики."
    ),
)


def _context_short(context: str, max_len: int = 200) -> str:
    text = context.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _build_template_questions(role_title: str, context: str) -> list[str]:
    ctx = _context_short(context)
    return [
        tpl.format(role=role_title, context_short=ctx)
        for tpl in QUESTION_TEMPLATES
    ]


def _case_summaries_for_prompt(
    db: Session,
    diagnostic_session_id: str,
    owner_username: str,
) -> str:
    stmt = (
        select(CaseModel)
        .where(
            CaseModel.diagnostic_session_id == diagnostic_session_id,
            CaseModel.owner_username == owner_username,
            CaseModel.status == "submitted",
        )
        .order_by(CaseModel.updated_at.desc())
        .limit(3)
    )
    cases = list(db.scalars(stmt).all())
    if not cases:
        return "Отправленные кейсы: нет."
    lines = []
    for case in cases:
        brief = _context_short(case.brief, max_len=120)
        score_part = ""
        if case.score is not None:
            score_part = f", балл {case.score}/100"
        lines.append(f"- «{case.title}»{score_part}: {brief}")
    return "Отправленные кейсы:\n" + "\n".join(lines)


def _resolve_exam_questions(
    db: Session,
    owner_username: str,
    role_title: str,
    context: str,
    kpi_notes: str,
    diagnostic_session_id: str,
) -> list[str]:
    summaries = _case_summaries_for_prompt(
        db,
        diagnostic_session_id,
        owner_username,
    )
    llm_questions = generate_exam_questions(
        role_title=role_title,
        context=context,
        kpi_notes=kpi_notes,
        case_summaries=summaries,
    )
    if llm_questions:
        return llm_questions
    return _build_template_questions(role_title, context)


def list_sessions(
    db: Session,
    owner_username: str,
    status: str | None = None,
) -> list[ExamSessionModel]:
    stmt = (
        select(ExamSessionModel)
        .options(
            joinedload(ExamSessionModel.diagnostic_session),
            joinedload(ExamSessionModel.questions),
        )
        .where(ExamSessionModel.owner_username == owner_username)
    )
    if status:
        stmt = stmt.where(ExamSessionModel.status == status)
    stmt = stmt.order_by(ExamSessionModel.updated_at.desc())
    return list(db.scalars(stmt).unique().all())


def get_session(
    db: Session,
    session_id: str,
    owner_username: str,
) -> ExamSessionModel | None:
    stmt = (
        select(ExamSessionModel)
        .options(
            joinedload(ExamSessionModel.diagnostic_session),
            joinedload(ExamSessionModel.questions),
        )
        .where(
            ExamSessionModel.id == session_id,
            ExamSessionModel.owner_username == owner_username,
        )
    )
    return db.scalars(stmt).first()


def create_session(
    db: Session,
    owner_username: str,
    diagnostic_session_id: str,
    time_limit_minutes: int,
) -> ExamSessionModel | None:
    diagnostic = diagnostic_service.get_session(
        db,
        diagnostic_session_id,
        owner_username,
    )
    if diagnostic is None or diagnostic.status != "completed":
        return None

    now = datetime.now(timezone.utc)
    title = f"Экзамен: {diagnostic.role_title}"
    row = ExamSessionModel(
        id=str(uuid.uuid4()),
        owner_username=owner_username,
        diagnostic_session_id=diagnostic_session_id,
        title=title,
        status="draft",
        time_limit_minutes=time_limit_minutes,
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
) -> ExamSessionModel | None:
    row = get_session(db, session_id, owner_username)
    if row is None or row.status != "draft":
        return None

    diagnostic = row.diagnostic_session
    if diagnostic is None:
        return None

    now = datetime.now(timezone.utc)
    question_texts = _resolve_exam_questions(
        db,
        owner_username,
        diagnostic.role_title,
        diagnostic.context,
        diagnostic.kpi_notes,
        diagnostic.id,
    )
    for idx, text in enumerate(question_texts):
        question = ExamQuestionModel(
            id=str(uuid.uuid4()),
            exam_session_id=row.id,
            sort_order=idx + 1,
            question_text=text,
            status="pending",
            created_at=now,
            updated_at=now,
        )
        db.add(question)

    row.status = "running"
    row.started_at = now
    row.updated_at = now
    db.commit()
    return get_session(db, session_id, owner_username)


def update_question_answer(
    db: Session,
    session_id: str,
    question_id: str,
    owner_username: str,
    user_answer: str,
) -> ExamQuestionModel | None:
    row = get_session(db, session_id, owner_username)
    if row is None or row.status != "running":
        return None

    question = next((q for q in row.questions if q.id == question_id), None)
    if question is None:
        return None

    question.user_answer = user_answer.strip()
    question.status = "answered"
    question.updated_at = datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(question)
    return question


def complete_session(
    db: Session,
    session_id: str,
    owner_username: str,
) -> ExamSessionModel | None:
    row = get_session(db, session_id, owner_username)
    if row is None or row.status != "running":
        return None

    if not row.questions:
        return None

    unanswered = [q for q in row.questions if not (q.user_answer or "").strip()]
    if unanswered:
        return None

    diagnostic = row.diagnostic_session
    role_title = diagnostic.role_title if diagnostic else ""
    context = diagnostic.context if diagnostic else ""
    kpi_notes = diagnostic.kpi_notes if diagnostic else ""

    sorted_questions = sorted(row.questions, key=lambda q: q.sort_order)
    batch_items = [
        (
            question.sort_order,
            question.question_text,
            question.user_answer or "",
        )
        for question in sorted_questions
    ]
    overall, evaluations = evaluate_exam_session_batch(
        role_title=role_title,
        context=context,
        kpi_notes=kpi_notes,
        items=batch_items,
    )
    feedback_parts: list[str] = []
    now = datetime.now(timezone.utc)

    for question, (score, feedback) in zip(sorted_questions, evaluations):
        question.score = score
        question.feedback = feedback
        question.updated_at = now
        feedback_parts.append(
            f"Вопрос {question.sort_order}: {feedback}"
        )
    row.status = "completed"
    row.completed_at = now
    row.overall_score = overall
    row.overall_feedback = "\n".join(feedback_parts)
    row.result_summary = (
        f"Экзамен завершён. Итоговая оценка: {overall}/100. "
        f"Отвечено вопросов: {len(row.questions)}."
    )
    row.updated_at = now
    db.commit()
    return get_session(db, session_id, owner_username)
