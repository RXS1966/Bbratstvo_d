"""Тесты /api/diagnostic."""


def test_diagnostic_lifecycle(client, candidate_headers) -> None:
    created = client.post(
        "/api/diagnostic/sessions",
        json={
            "role_title": "Менеджер",
            "context": "Срез Q1",
            "kpi_notes": "Выручка",
        },
        headers=candidate_headers,
    )
    assert created.status_code == 201
    session_id = created.json()["id"]
    assert created.json()["status"] == "draft"

    started = client.post(
        f"/api/diagnostic/sessions/{session_id}/start",
        headers=candidate_headers,
    )
    assert started.status_code == 200
    assert started.json()["status"] == "running"

    completed = client.post(
        f"/api/diagnostic/sessions/{session_id}/complete",
        headers=candidate_headers,
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
    assert completed.json()["result_summary"]

    listed = client.get(
        "/api/diagnostic/sessions",
        params={"status": "completed"},
        headers=candidate_headers,
    )
    assert listed.status_code == 200
    ids = [row["id"] for row in listed.json()]
    assert session_id in ids


def test_complete_without_start_returns_400(
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
    session_id = created.json()["id"]
    response = client.post(
        f"/api/diagnostic/sessions/{session_id}/complete",
        headers=candidate_headers,
    )
    assert response.status_code == 400
