"""Обзор команды для руководителя."""
from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.diagnostic import DiagnosticSessionModel
from app.models.exam import ExamSessionModel


def _case_counts(cases: list) -> tuple[int, int]:
    total = len(cases)
    submitted = sum(1 for c in cases if c.status == "submitted")
    return total, submitted


def _progress_label(total: int, submitted: int) -> str:
    if total == 0:
        return "Кейсов пока нет"
    if submitted == total:
        return f"Кейсов: {total}, все отправлены"
    return f"Кейсов: {submitted} из {total} отправлено"


def _exam_item_dict(exam: ExamSessionModel) -> dict:
    total = len(exam.questions)
    answered = sum(1 for q in exam.questions if (q.user_answer or "").strip())
    return {
        "owner_username": exam.owner_username,
        "exam_session_id": exam.id,
        "diagnostic_session_id": exam.diagnostic_session_id,
        "title": exam.title,
        "status": exam.status,
        "overall_score": exam.overall_score,
        "questions_total": total,
        "questions_answered": answered,
        "updated_at": exam.updated_at,
    }


def _max_dt(*values: datetime | None) -> datetime | None:
    present = [v for v in values if v is not None]
    if not present:
        return None
    return max(present)


def get_team_overview(db: Session) -> dict:
    stmt = (
        select(DiagnosticSessionModel)
        .options(joinedload(DiagnosticSessionModel.cases))
        .order_by(DiagnosticSessionModel.updated_at.desc())
    )
    sessions = list(db.scalars(stmt).unique().all())

    items = []
    owners: set[str] = set()
    for session in sessions:
        owners.add(session.owner_username)
        total, submitted = _case_counts(session.cases)
        items.append(
            {
                "owner_username": session.owner_username,
                "session_id": session.id,
                "role_title": session.role_title,
                "status": session.status,
                "cases_total": total,
                "cases_submitted": submitted,
                "progress_label": _progress_label(total, submitted),
                "updated_at": session.updated_at,
            }
        )

    exam_rows = list(
        db.scalars(
            select(ExamSessionModel)
            .options(joinedload(ExamSessionModel.questions))
            .order_by(ExamSessionModel.updated_at.desc())
        ).unique().all()
    )
    exam_items = [_exam_item_dict(exam) for exam in exam_rows]

    return {
        "sessions": items,
        "exams": exam_items,
        "candidates_count": len(owners),
    }


def list_candidates(db: Session) -> list[dict]:
    overview = get_team_overview(db)
    by_user: dict[str, dict] = {}

    for session in overview["sessions"]:
        username = session["owner_username"]
        if username not in by_user:
            by_user[username] = {
                "username": username,
                "sessions_total": 0,
                "sessions_completed": 0,
                "cases_submitted": 0,
                "exams_completed": 0,
                "last_activity_at": None,
            }
        row = by_user[username]
        row["sessions_total"] += 1
        if session["status"] == "completed":
            row["sessions_completed"] += 1
        row["cases_submitted"] += session["cases_submitted"]
        row["last_activity_at"] = _max_dt(
            row["last_activity_at"],
            session["updated_at"],
        )

    for exam in overview["exams"]:
        username = exam["owner_username"]
        if username not in by_user:
            by_user[username] = {
                "username": username,
                "sessions_total": 0,
                "sessions_completed": 0,
                "cases_submitted": 0,
                "exams_completed": 0,
                "last_activity_at": None,
            }
        row = by_user[username]
        if exam["status"] == "completed":
            row["exams_completed"] += 1
        row["last_activity_at"] = _max_dt(
            row["last_activity_at"],
            exam["updated_at"],
        )

    rows = list(by_user.values())
    min_dt = datetime.min.replace(tzinfo=timezone.utc)
    rows.sort(
        key=lambda r: r["last_activity_at"] or min_dt,
        reverse=True,
    )
    return rows


def get_candidate_detail(db: Session, username: str) -> dict | None:
    key = username.strip().lower()
    stmt = (
        select(DiagnosticSessionModel)
        .options(joinedload(DiagnosticSessionModel.cases))
        .where(DiagnosticSessionModel.owner_username == key)
        .order_by(DiagnosticSessionModel.updated_at.desc())
    )
    sessions = list(db.scalars(stmt).unique().all())
    if not sessions:
        exam_only = list(
            db.scalars(
                select(ExamSessionModel)
                .options(joinedload(ExamSessionModel.questions))
                .where(ExamSessionModel.owner_username == key)
            ).unique().all()
        )
        if not exam_only:
            return None

    exam_rows = list(
        db.scalars(
            select(ExamSessionModel)
            .options(joinedload(ExamSessionModel.questions))
            .where(ExamSessionModel.owner_username == key)
            .order_by(ExamSessionModel.updated_at.desc())
        ).unique().all()
    )
    exams_by_session: dict[str, list[dict]] = defaultdict(list)
    for exam in exam_rows:
        exams_by_session[exam.diagnostic_session_id].append(
            _exam_item_dict(exam)
        )

    session_items = []
    for session in sessions:
        total, submitted = _case_counts(session.cases)
        cases_sorted = sorted(
            session.cases,
            key=lambda c: c.updated_at,
            reverse=True,
        )
        session_items.append(
            {
                "session_id": session.id,
                "role_title": session.role_title,
                "context": session.context,
                "status": session.status,
                "result_summary": session.result_summary,
                "cases_total": total,
                "cases_submitted": submitted,
                "progress_label": _progress_label(total, submitted),
                "updated_at": session.updated_at,
                "cases": [
                    {
                        "id": case.id,
                        "title": case.title,
                        "status": case.status,
                        "score": case.score,
                        "feedback": case.feedback,
                        "updated_at": case.updated_at,
                    }
                    for case in cases_sorted
                ],
                "exams": exams_by_session.get(session.id, []),
            }
        )

    return {
        "username": key,
        "sessions": session_items,
    }


def build_overview_csv(db: Session) -> str:
    """CSV для руководителя: срезы и экзамены команды."""
    overview = get_team_overview(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(
        [
            "type",
            "owner_username",
            "session_id",
            "role_or_title",
            "status",
            "cases_submitted",
            "cases_total",
            "overall_score",
            "updated_at",
        ]
    )
    for session in overview["sessions"]:
        writer.writerow(
            [
                "diagnostic",
                session["owner_username"],
                session["session_id"],
                session["role_title"],
                session["status"],
                session["cases_submitted"],
                session["cases_total"],
                "",
                session["updated_at"].isoformat()
                if session["updated_at"]
                else "",
            ]
        )
    for exam in overview["exams"]:
        writer.writerow(
            [
                "exam",
                exam["owner_username"],
                exam["exam_session_id"],
                exam["title"],
                exam["status"],
                exam["questions_answered"],
                exam["questions_total"],
                exam["overall_score"] if exam["overall_score"] is not None else "",
                exam["updated_at"].isoformat()
                if exam["updated_at"]
                else "",
            ]
        )
    return buffer.getvalue()
