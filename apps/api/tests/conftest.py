"""Фикстуры pytest: SQLite in-memory, TestClient, мок LLM."""
from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import (  # noqa: F401 — регистрация моделей
    CaseModel,
    DiagnosticSessionModel,
    ExamQuestionModel,
    ExamSessionModel,
    UserModel,
)
from app.services import user_service


@pytest.fixture
def db_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    with sessionmaker(bind=engine)() as bootstrap:
        user_service.ensure_demo_users(bootstrap)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(db_engine) -> Generator[Session, None, None]:
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    import os

    os.environ["SKIP_USER_BOOTSTRAP"] = "1"

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    os.environ.pop("SKIP_USER_BOOTSTRAP", None)


@pytest.fixture(autouse=True)
def mock_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    """Без реальных вызовов OpenAI/Ollama в тестах."""

    def fake_case_eval(**_kwargs: object) -> tuple[int, str]:
        return 82, "Тестовая оценка кейса."

    def fake_exam_eval(**_kwargs: object) -> tuple[int, str]:
        return 77, "Тестовая оценка экзамена."

    monkeypatch.setattr(
        "app.services.case_service.evaluate_case_answer",
        fake_case_eval,
    )
    def fake_exam_batch(**_kwargs: object) -> tuple[int, list[tuple[int, str]]]:
        per = [(77, "Тестовая оценка экзамена.")] * 3
        return 77, per

    monkeypatch.setattr(
        "app.services.exam_service.evaluate_exam_session_batch",
        fake_exam_batch,
    )
    monkeypatch.setattr(
        "app.services.exam_service.generate_exam_questions",
        lambda **_kwargs: None,
    )


@pytest.fixture
def candidate_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": "demo", "password": "demo"},
    )
    assert response.status_code == 200
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def create_completed_diagnostic(
    client: TestClient,
    headers: dict[str, str],
) -> str:
    """Создать и завершить диагностический срез, вернуть id."""
    payload = {
        "role_title": "Тестовая роль",
        "context": "Контекст для автотестов",
        "kpi_notes": "KPI тест",
    }
    created = client.post(
        "/api/diagnostic/sessions",
        json=payload,
        headers=headers,
    )
    assert created.status_code == 201
    session_id = created.json()["id"]

    started = client.post(
        f"/api/diagnostic/sessions/{session_id}/start",
        headers=headers,
    )
    assert started.status_code == 200

    completed = client.post(
        f"/api/diagnostic/sessions/{session_id}/complete",
        headers=headers,
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
    return session_id
