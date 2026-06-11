from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.diagnostic import DiagnosticSessionModel
from app.schemas import (
    DiagnosticSessionCreate,
    DiagnosticSessionResponse,
)
from app.security import ROLE_ADMIN, ROLE_CANDIDATE, require_roles
from app.services import diagnostic_service

router = APIRouter(prefix="/diagnostic", tags=["diagnostic"])

_candidate_only = require_roles(ROLE_CANDIDATE, ROLE_ADMIN)


def _to_response(row: DiagnosticSessionModel) -> DiagnosticSessionResponse:
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


@router.get("/sessions", response_model=list[DiagnosticSessionResponse])
def list_sessions(
    status: str | None = Query(default=None),
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> list[DiagnosticSessionResponse]:
    rows = diagnostic_service.list_sessions(
        db,
        current_user["username"],
        status=status,
    )
    return [_to_response(r) for r in rows]


@router.post(
    "/sessions",
    response_model=DiagnosticSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    body: DiagnosticSessionCreate,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> DiagnosticSessionResponse:
    row = diagnostic_service.create_session(
        db,
        owner_username=current_user["username"],
        role_title=body.role_title,
        context=body.context,
        kpi_notes=body.kpi_notes,
    )
    return _to_response(row)


@router.get("/sessions/{session_id}", response_model=DiagnosticSessionResponse)
def get_session(
    session_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> DiagnosticSessionResponse:
    row = diagnostic_service.get_session(db, session_id, current_user["username"])
    if row is None:
        raise HTTPException(status_code=404, detail="Срез не найден")
    return _to_response(row)


@router.post(
    "/sessions/{session_id}/start",
    response_model=DiagnosticSessionResponse,
)
def start_session(
    session_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> DiagnosticSessionResponse:
    row = diagnostic_service.start_session(
        db,
        session_id,
        current_user["username"],
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Срез не найден или уже запущен",
        )
    return _to_response(row)


@router.post(
    "/sessions/{session_id}/complete",
    response_model=DiagnosticSessionResponse,
)
def complete_session(
    session_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> DiagnosticSessionResponse:
    row = diagnostic_service.complete_session(
        db,
        session_id,
        current_user["username"],
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Срез не найден или не в статусе running",
        )
    return _to_response(row)
