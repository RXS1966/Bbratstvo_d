from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.case import CaseModel
from app.models.diagnostic import DiagnosticSessionModel
from app.schemas import (
    DiagnosticSessionResponse,
    ResultCaseItem,
    ResultDetailResponse,
    ResultExamItem,
    ResultListItem,
)
from app.security import ROLE_ADMIN, ROLE_CANDIDATE, require_roles
from app.services import result_service

router = APIRouter(prefix="/results", tags=["results"])

_candidate_only = require_roles(ROLE_CANDIDATE, ROLE_ADMIN)


def _session_response(row: DiagnosticSessionModel) -> DiagnosticSessionResponse:
    return DiagnosticSessionResponse(
        id=row.id,
        role_title=row.role_title,
        context=row.context,
        kpi_notes=row.kpi_notes,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
        result_summary=row.result_summary,
    )


def _case_item(row: CaseModel) -> ResultCaseItem:
    return ResultCaseItem(
        id=row.id,
        title=row.title,
        status=row.status,
        user_answer=row.user_answer,
        score=row.score,
        feedback=row.feedback,
        updated_at=row.updated_at,
    )


@router.get("", response_model=list[ResultListItem])
def list_results(
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> list[ResultListItem]:
    rows = result_service.list_results(db, current_user["username"])
    return [ResultListItem(**item) for item in rows]


@router.get("/{session_id}", response_model=ResultDetailResponse)
def get_result(
    session_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> ResultDetailResponse:
    data = result_service.get_result(
        db,
        session_id,
        current_user["username"],
    )
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Результат не найден или срез не завершён",
        )
    return ResultDetailResponse(
        session=_session_response(data["session"]),
        cases=[_case_item(c) for c in data["cases"]],
        cases_total=data["cases_total"],
        cases_submitted=data["cases_submitted"],
        progress_label=data["progress_label"],
        exams=[ResultExamItem(**item) for item in data["exams"]],
        exams_total=data["exams_total"],
        exams_completed=data["exams_completed"],
        exam_progress_label=data["exam_progress_label"],
    )
