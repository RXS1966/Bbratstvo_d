"""Тесты кабинета руководителя."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_completed_diagnostic


@pytest.fixture
def manager_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": "manager", "password": "manager"},
    )
    assert response.status_code == 200
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_manager_candidates_and_detail(
    client: TestClient,
    candidate_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    session_id = create_completed_diagnostic(client, candidate_headers)
    case = client.post(
        "/api/cases",
        json={
            "diagnostic_session_id": session_id,
            "title": "Кейс для manager",
            "brief": "Условие",
            "materials": "",
        },
        headers=candidate_headers,
    )
    case_id = case.json()["id"]
    client.post(
        f"/api/cases/{case_id}/submit",
        json={"user_answer": "Ответ кандидата."},
        headers=candidate_headers,
    )

    list_resp = client.get("/api/manager/candidates", headers=manager_headers)
    assert list_resp.status_code == 200
    candidates = list_resp.json()
    assert any(c["username"] == "demo" for c in candidates)

    detail_resp = client.get(
        "/api/manager/candidates/demo",
        headers=manager_headers,
    )
    assert detail_resp.status_code == 200
    body = detail_resp.json()
    assert body["username"] == "demo"
    assert len(body["sessions"]) >= 1
    session = next(s for s in body["sessions"] if s["session_id"] == session_id)
    assert session["cases_submitted"] >= 1
    assert len(session["cases"]) >= 1


def test_manager_detail_not_found(
    client: TestClient,
    manager_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/manager/candidates/nobody",
        headers=manager_headers,
    )
    assert response.status_code == 404


def test_manager_export_csv(
    client: TestClient,
    candidate_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    create_completed_diagnostic(client, candidate_headers)
    response = client.get(
        "/api/manager/export.csv",
        headers=manager_headers,
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    body = response.text
    assert "owner_username" in body
    assert "diagnostic" in body


def test_manager_forbidden_for_candidate(
    client: TestClient,
    candidate_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/manager/candidates",
        headers=candidate_headers,
    )
    assert response.status_code == 403
