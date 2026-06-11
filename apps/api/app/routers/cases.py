from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.case import CaseModel
from app.schemas import CaseAnswerUpdate, CaseCreate, CaseResponse, CaseSubmit
from app.security import ROLE_ADMIN, ROLE_CANDIDATE, require_roles
from app.services import case_service

router = APIRouter(prefix="/cases", tags=["cases"])

_candidate_only = require_roles(ROLE_CANDIDATE, ROLE_ADMIN)


def _to_response(row: CaseModel) -> CaseResponse:
    role_title = None
    if row.diagnostic_session is not None:
        role_title = row.diagnostic_session.role_title
    return CaseResponse(
        id=row.id,
        diagnostic_session_id=row.diagnostic_session_id,
        diagnostic_role_title=role_title,
        title=row.title,
        brief=row.brief,
        materials=row.materials,
        user_answer=row.user_answer,
        status=row.status,
        score=row.score,
        feedback=row.feedback,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=list[CaseResponse])
def list_cases(
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> list[CaseResponse]:
    rows = case_service.list_cases(db, current_user["username"])
    return [_to_response(r) for r in rows]


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    body: CaseCreate,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> CaseResponse:
    row = case_service.create_case(
        db,
        owner_username=current_user["username"],
        diagnostic_session_id=body.diagnostic_session_id,
        title=body.title,
        brief=body.brief,
        materials=body.materials,
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Нужен завершённый диагностический срез",
        )
    return _to_response(row)


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: str,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> CaseResponse:
    row = case_service.get_case(db, case_id, current_user["username"])
    if row is None:
        raise HTTPException(status_code=404, detail="Кейс не найден")
    return _to_response(row)


@router.patch("/{case_id}/answer", response_model=CaseResponse)
def update_answer(
    case_id: str,
    body: CaseAnswerUpdate,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> CaseResponse:
    row = case_service.update_answer(
        db,
        case_id,
        current_user["username"],
        body.user_answer,
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Кейс не найден или уже отправлен",
        )
    return _to_response(row)


@router.post("/{case_id}/submit", response_model=CaseResponse)
def submit_case(
    case_id: str,
    body: CaseSubmit,
    current_user: dict[str, str] = Depends(_candidate_only),
    db: Session = Depends(get_db),
) -> CaseResponse:
    row = case_service.submit_case(
        db,
        case_id,
        current_user["username"],
        body.user_answer,
    )
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Кейс не найден, пустой ответ или уже отправлен",
        )
    return _to_response(row)
