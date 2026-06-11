"""Сводка результатов: срез, кейсы и экзамены."""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.case import CaseModel
from app.models.diagnostic import DiagnosticSessionModel
from app.models.exam import ExamSessionModel


def _case_counts(cases: list[CaseModel]) -> tuple[int, int]:
    total = len(cases)
    submitted = sum(1 for c in cases if c.status == "submitted")
    return total, submitted


def _progress_label(total: int, submitted: int) -> str:
    if total == 0:
        return "Кейсов пока нет"
    if submitted == total:
        return f"Кейсов: {total}, все отправлены"
    return f"Кейсов: {submitted} из {total} отправлено"


def _exam_summary(exams: list[ExamSessionModel]) -> dict:
    total = len(exams)
    completed = [e for e in exams if e.status == "completed"]
    completed_count = len(completed)
    best_score: int | None = None
    if completed:
        scores = [e.overall_score for e in completed if e.overall_score is not None]
        if scores:
            best_score = max(scores)

    if total == 0:
        label = "Экзамен не создан"
    elif completed_count > 0:
        latest = max(completed, key=lambda e: e.updated_at)
        if latest.overall_score is not None:
            label = f"Экзамен: {latest.overall_score}/100"
        else:
            label = "Экзамен завершён"
    elif any(e.status == "running" for e in exams):
        label = "Экзамен в работе"
    else:
        label = "Экзамен: черновик"

    return {
        "exams_total": total,
        "exams_completed": completed_count,
        "exam_progress_label": label,
        "exam_best_score": best_score,
    }


def _load_exams_by_diagnostic(
    db: Session,
    owner_username: str,
    diagnostic_ids: list[str],
) -> dict[str, list[ExamSessionModel]]:
    if not diagnostic_ids:
        return {}

    stmt = (
        select(ExamSessionModel)
        .options(joinedload(ExamSessionModel.questions))
        .where(
            ExamSessionModel.owner_username == owner_username,
            ExamSessionModel.diagnostic_session_id.in_(diagnostic_ids),
        )
        .order_by(ExamSessionModel.updated_at.desc())
    )
    rows = list(db.scalars(stmt).unique().all())
    grouped: dict[str, list[ExamSessionModel]] = defaultdict(list)
    for exam in rows:
        grouped[exam.diagnostic_session_id].append(exam)
    return grouped


def _exam_detail_items(exams: list[ExamSessionModel]) -> list[dict]:
    items = []
    for exam in sorted(exams, key=lambda e: e.updated_at, reverse=True):
        questions = sorted(exam.questions, key=lambda q: q.sort_order)
        answered = sum(
            1 for q in questions if (q.user_answer or "").strip()
        )
        items.append(
            {
                "id": exam.id,
                "title": exam.title,
                "status": exam.status,
                "overall_score": exam.overall_score,
                "overall_feedback": exam.overall_feedback,
                "result_summary": exam.result_summary,
                "questions_total": len(questions),
                "questions_answered": answered,
                "updated_at": exam.updated_at,
                "questions": [
                    {
                        "sort_order": q.sort_order,
                        "question_text": q.question_text,
                        "status": q.status,
                        "score": q.score,
                        "feedback": q.feedback,
                    }
                    for q in questions
                ],
            }
        )
    return items


def list_results(
    db: Session,
    owner_username: str,
) -> list[dict]:
    stmt = (
        select(DiagnosticSessionModel)
        .options(joinedload(DiagnosticSessionModel.cases))
        .where(
            DiagnosticSessionModel.owner_username == owner_username,
            DiagnosticSessionModel.status == "completed",
        )
        .order_by(DiagnosticSessionModel.updated_at.desc())
    )
    rows = list(db.scalars(stmt).unique().all())
    exams_map = _load_exams_by_diagnostic(
        db,
        owner_username,
        [row.id for row in rows],
    )

    items = []
    for row in rows:
        total, submitted = _case_counts(row.cases)
        exam_info = _exam_summary(exams_map.get(row.id, []))
        items.append(
            {
                "session_id": row.id,
                "role_title": row.role_title,
                "status": row.status,
                "result_summary": row.result_summary,
                "cases_total": total,
                "cases_submitted": submitted,
                "progress_label": _progress_label(total, submitted),
                "updated_at": row.updated_at,
                **exam_info,
            }
        )
    return items


def get_result(
    db: Session,
    session_id: str,
    owner_username: str,
) -> dict | None:
    stmt = (
        select(DiagnosticSessionModel)
        .options(joinedload(DiagnosticSessionModel.cases))
        .where(
            DiagnosticSessionModel.id == session_id,
            DiagnosticSessionModel.owner_username == owner_username,
        )
    )
    row = db.scalars(stmt).unique().first()
    if row is None:
        return None
    if row.status != "completed":
        return None

    total, submitted = _case_counts(row.cases)
    cases_sorted = sorted(
        row.cases,
        key=lambda c: c.updated_at,
        reverse=True,
    )
    exams_map = _load_exams_by_diagnostic(db, owner_username, [session_id])
    session_exams = exams_map.get(session_id, [])
    exam_info = _exam_summary(session_exams)

    return {
        "session": row,
        "cases": cases_sorted,
        "cases_total": total,
        "cases_submitted": submitted,
        "progress_label": _progress_label(total, submitted),
        "exams": _exam_detail_items(session_exams),
        **exam_info,
    }
