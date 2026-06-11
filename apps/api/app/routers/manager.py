from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import (
    ManagerCandidateDetailResponse,
    ManagerCandidateSummary,
    ManagerCaseDetailItem,
    ManagerExamOverviewItem,
    ManagerOverviewResponse,
    ManagerSessionDetailItem,
    ManagerTeamSessionItem,
)
from app.security import ROLE_ADMIN, ROLE_MANAGER, require_roles
from app.services import manager_service

router = APIRouter(prefix="/manager", tags=["manager"])

_manager_only = require_roles(ROLE_MANAGER, ROLE_ADMIN)


@router.get("/export.csv")
def export_team_csv(
    _user: dict[str, str] = Depends(_manager_only),
    db: Session = Depends(get_db),
) -> Response:
    content = manager_service.build_overview_csv(db)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="team-overview.csv"',
        },
    )


@router.get("/overview", response_model=ManagerOverviewResponse)
def team_overview(
    _user: dict[str, str] = Depends(_manager_only),
    db: Session = Depends(get_db),
) -> ManagerOverviewResponse:
    data = manager_service.get_team_overview(db)
    return ManagerOverviewResponse(
        sessions=[ManagerTeamSessionItem(**item) for item in data["sessions"]],
        exams=[ManagerExamOverviewItem(**item) for item in data["exams"]],
        candidates_count=data["candidates_count"],
    )


@router.get("/candidates", response_model=list[ManagerCandidateSummary])
def list_candidates(
    _user: dict[str, str] = Depends(_manager_only),
    db: Session = Depends(get_db),
) -> list[ManagerCandidateSummary]:
    rows = manager_service.list_candidates(db)
    return [ManagerCandidateSummary(**item) for item in rows]


@router.get(
    "/candidates/{username}",
    response_model=ManagerCandidateDetailResponse,
)
def candidate_detail(
    username: str,
    _user: dict[str, str] = Depends(_manager_only),
    db: Session = Depends(get_db),
) -> ManagerCandidateDetailResponse:
    data = manager_service.get_candidate_detail(db, username)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Кандидат не найден или нет данных",
        )
    sessions = []
    for item in data["sessions"]:
        sessions.append(
            ManagerSessionDetailItem(
                session_id=item["session_id"],
                role_title=item["role_title"],
                context=item["context"],
                status=item["status"],
                result_summary=item["result_summary"],
                cases_total=item["cases_total"],
                cases_submitted=item["cases_submitted"],
                progress_label=item["progress_label"],
                updated_at=item["updated_at"],
                cases=[
                    ManagerCaseDetailItem(**c) for c in item["cases"]
                ],
                exams=[
                    ManagerExamOverviewItem(**e) for e in item["exams"]
                ],
            )
        )
    return ManagerCandidateDetailResponse(
        username=data["username"],
        sessions=sessions,
    )
