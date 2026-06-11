"""Тесты /api/cases."""

from tests.conftest import create_completed_diagnostic


def test_case_requires_completed_diagnostic(
    client,
    candidate_headers,
) -> None:
    created = client.post(
        "/api/diagnostic/sessions",
        json={
            "role_title": "Роль",
            "context": "Контекст",
            "kpi_notes": "",
        },
        headers=candidate_headers,
    )
    draft_id = created.json()["id"]

    response = client.post(
        "/api/cases",
        json={
            "diagnostic_session_id": draft_id,
            "title": "Кейс",
            "brief": "Условие",
            "materials": "",
        },
        headers=candidate_headers,
    )
    assert response.status_code == 400
    assert "срез" in response.json()["detail"].lower()


def test_case_submit_with_mock_llm(client, candidate_headers) -> None:
    session_id = create_completed_diagnostic(client, candidate_headers)

    created = client.post(
        "/api/cases",
        json={
            "diagnostic_session_id": session_id,
            "title": "Кейс: возражение",
            "brief": "Клиент сомневается в цене",
            "materials": "Прайс",
        },
        headers=candidate_headers,
    )
    assert created.status_code == 201
    case_id = created.json()["id"]

    submitted = client.post(
        f"/api/cases/{case_id}/submit",
        json={"user_answer": "Снижаем риски пилотом на 30 дней."},
        headers=candidate_headers,
    )
    assert submitted.status_code == 200
    body = submitted.json()
    assert body["status"] == "submitted"
    assert body["score"] == 82
    assert "Тестовая оценка кейса" in body["feedback"]
