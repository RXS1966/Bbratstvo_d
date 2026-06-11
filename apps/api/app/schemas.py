from datetime import datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class LoginResponse(BaseModel):
    token: str
    username: str


class UserResponse(BaseModel):
    username: str
    role: str


class HealthResponse(BaseModel):
    status: str
    service: str
    llm_configured: bool = False
    db_ok: bool = False


class SectionResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    message: str


class DiagnosticSessionCreate(BaseModel):
    role_title: str = Field(min_length=1, max_length=128)
    context: str = Field(min_length=1, max_length=4000)
    kpi_notes: str = Field(default="", max_length=4000)


class DiagnosticSessionResponse(BaseModel):
    id: str
    role_title: str
    context: str
    kpi_notes: str
    status: str
    created_at: datetime
    updated_at: datetime
    result_summary: str | None = None


class CaseCreate(BaseModel):
    diagnostic_session_id: str = Field(min_length=36, max_length=36)
    title: str = Field(min_length=1, max_length=256)
    brief: str = Field(min_length=1, max_length=8000)
    materials: str = Field(default="", max_length=8000)


class CaseAnswerUpdate(BaseModel):
    user_answer: str = Field(min_length=1, max_length=8000)


class CaseSubmit(BaseModel):
    user_answer: str = Field(min_length=1, max_length=8000)


class CaseResponse(BaseModel):
    id: str
    diagnostic_session_id: str
    diagnostic_role_title: str | None = None
    title: str
    brief: str
    materials: str
    user_answer: str | None
    status: str
    score: int | None
    feedback: str | None
    created_at: datetime
    updated_at: datetime


class ResultListItem(BaseModel):
    session_id: str
    role_title: str
    status: str
    result_summary: str | None
    cases_total: int
    cases_submitted: int
    progress_label: str
    exams_total: int = 0
    exams_completed: int = 0
    exam_progress_label: str = "Экзамен не создан"
    exam_best_score: int | None = None
    updated_at: datetime


class ResultCaseItem(BaseModel):
    id: str
    title: str
    status: str
    user_answer: str | None
    score: int | None
    feedback: str | None
    updated_at: datetime


class ResultExamQuestionItem(BaseModel):
    sort_order: int
    question_text: str
    status: str
    score: int | None
    feedback: str | None


class ResultExamItem(BaseModel):
    id: str
    title: str
    status: str
    overall_score: int | None
    overall_feedback: str | None
    result_summary: str | None
    questions_total: int
    questions_answered: int
    updated_at: datetime
    questions: list[ResultExamQuestionItem] = []


class ResultDetailResponse(BaseModel):
    session: DiagnosticSessionResponse
    cases: list[ResultCaseItem]
    cases_total: int
    cases_submitted: int
    progress_label: str
    exams: list[ResultExamItem] = []
    exams_total: int = 0
    exams_completed: int = 0
    exam_progress_label: str = "Экзамен не создан"


class ManagerTeamSessionItem(BaseModel):
    owner_username: str
    session_id: str
    role_title: str
    status: str
    cases_total: int
    cases_submitted: int
    progress_label: str
    updated_at: datetime


class ManagerExamOverviewItem(BaseModel):
    owner_username: str
    exam_session_id: str
    diagnostic_session_id: str
    title: str
    status: str
    overall_score: int | None
    questions_total: int
    questions_answered: int
    updated_at: datetime


class ManagerOverviewResponse(BaseModel):
    sessions: list[ManagerTeamSessionItem]
    exams: list[ManagerExamOverviewItem] = []
    candidates_count: int


class ManagerCandidateSummary(BaseModel):
    username: str
    sessions_total: int
    sessions_completed: int
    cases_submitted: int
    exams_completed: int
    last_activity_at: datetime | None = None


class ManagerCaseDetailItem(BaseModel):
    id: str
    title: str
    status: str
    score: int | None
    feedback: str | None
    updated_at: datetime


class ManagerSessionDetailItem(BaseModel):
    session_id: str
    role_title: str
    context: str
    status: str
    result_summary: str | None
    cases_total: int
    cases_submitted: int
    progress_label: str
    updated_at: datetime
    cases: list[ManagerCaseDetailItem]
    exams: list[ManagerExamOverviewItem]


class ManagerCandidateDetailResponse(BaseModel):
    username: str
    sessions: list[ManagerSessionDetailItem]


class ExamSessionCreate(BaseModel):
    diagnostic_session_id: str = Field(min_length=36, max_length=36)
    time_limit_minutes: int = Field(default=30, ge=5, le=180)


class ExamQuestionAnswerUpdate(BaseModel):
    user_answer: str = Field(min_length=1, max_length=8000)


class ExamQuestionResponse(BaseModel):
    id: str
    sort_order: int
    question_text: str
    user_answer: str | None
    status: str
    score: int | None
    feedback: str | None


class ExamSessionResponse(BaseModel):
    id: str
    diagnostic_session_id: str
    diagnostic_role_title: str | None = None
    title: str
    status: str
    time_limit_minutes: int
    started_at: datetime | None
    completed_at: datetime | None
    overall_score: int | None
    overall_feedback: str | None
    result_summary: str | None
    questions: list[ExamQuestionResponse] = []
    created_at: datetime
    updated_at: datetime
