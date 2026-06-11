from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.exam import ExamQuestionModel, ExamSessionModel
from app.schemas import (
    ExamQuestionAnswerUpdate,
    ExamQuestionResponse,
    ExamSessionCreate,
    ExamSessionResponse,
)
from app.security import ROLE_ADMIN, ROLE_CANDIDATE, require_roles
from app.services import exam_service

router = APIRouter(prefix="/exam", tags=["exam"])

_candidate_only = require_roles(ROLE_CANDIDATE, ROLE_ADMIN)


def _question_response(q: ExamQuestionModel) -> ExamQuestionResponse:
    return ExamQuestionResponse(
        id=q.id,
        sort_order=q.sort_order,
        question_text=q.question_text,
        user_answer=q.user_answer,
        status=q.status,
        score=q.score,
        feedback=q.feedback,
    )


def _session_response(row: ExamSessionModel) -> ExamSessionResponse:
    diagnostic = row.diagnostic_session
    questions = sorted(row.questions, key=lambda q: q.sort_order)
    return ExamSessionResponse(
        id=row.id,
        diagnostic_session_id=row.diagnostic_session_id,
        diagnostic_role_title=(
            diagnostic.role_title if diagnostic else None
        ),
        title=row.title,
        status=row.status,
        time_limit_minutes=row.time_limit_minutes,
        started_at=row.started_at,
        completed_at=row.completed_at,
        overall_score=row.overall_score,
        overall_feedback=row.overall_feedback,
        result_summary=row.result_summary,
        questions=[_question_response(q) for q in questions],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/sessions", response_model=list[ExamSessionResponse])
def list_sessions(
    status: str | None = Query(default=None),
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> list[ExamSessionResponse]:
    rows = exam_service.list_sessions(
        db,
        current_user["username"],
        status=status,
    )
    return [_session_response(r) for r in rows]


@router.post(
    "/sessions",
    response_model=ExamSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    body: ExamSessionCreate,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> ExamSessionResponse:
    row = exam_service.create_session(
        db,
        owner_username=current_user["username"],
        diagnostic_session_id=body.diagnostic_session_id,
        time_limit_minutes=body.time_limit_minutes,
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Нужен завершённый диагностический срез",
        )
    full = exam_service.get_session(
        db,
        row.id,
        current_user["username"],
    )
    assert full is not None
    return _session_response(full)


@router.get("/sessions/{session_id}", response_model=ExamSessionResponse)
def get_session(
    session_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> ExamSessionResponse:
    row = exam_service.get_session(db, session_id, current_user["username"])
    if row is None:
        raise HTTPException(status_code=404, detail="Экзамен не найден")
    return _session_response(row)


@router.post(
    "/sessions/{session_id}/start",
    response_model=ExamSessionResponse,
)
def start_session(
    session_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> ExamSessionResponse:
    row = exam_service.start_session(
        db,
        session_id,
        current_user["username"],
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Экзамен не найден или уже запущен",
        )
    return _session_response(row)


@router.patch(
    "/sessions/{session_id}/questions/{question_id}/answer",
    response_model=ExamQuestionResponse,
)
def update_answer(
    session_id: str,
    question_id: str,
    body: ExamQuestionAnswerUpdate,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> ExamQuestionResponse:
    question = exam_service.update_question_answer(
        db,
        session_id,
        question_id,
        current_user["username"],
        body.user_answer,
    )
    if question is None:
        raise HTTPException(
            status_code=400,
            detail="Экзамен не в работе или вопрос не найден",
        )
    return _question_response(question)


@router.post(
    "/sessions/{session_id}/complete",
    response_model=ExamSessionResponse,
)
def complete_session(
    session_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> ExamSessionResponse:
    row = exam_service.complete_session(
        db,
        session_id,
        current_user["username"],
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Экзамен не найден, не запущен или не все вопросы "
                "имеют ответы"
            ),
        )
    return _session_response(row)
