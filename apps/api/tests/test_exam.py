"""Тесты /api/exam."""

from tests.conftest import create_completed_diagnostic


def test_exam_lifecycle(client, candidate_headers) -> None:
    session_id = create_completed_diagnostic(client, candidate_headers)

    created = client.post(
        "/api/exam/sessions",
        json={
            "diagnostic_session_id": session_id,
            "time_limit_minutes": 30,
        },
        headers=candidate_headers,
    )
    assert created.status_code == 201
    exam_id = created.json()["id"]
    assert created.json()["status"] == "draft"

    started = client.post(
        f"/api/exam/sessions/{exam_id}/start",
        headers=candidate_headers,
    )
    assert started.status_code == 200
    body = started.json()
    assert body["status"] == "running"
    assert len(body["questions"]) == 3
    assert body["started_at"] is not None

    for question in body["questions"]:
        saved = client.patch(
            f"/api/exam/sessions/{exam_id}/questions/{question['id']}/answer",
            json={"user_answer": f"Ответ на вопрос {question['sort_order']}."},
            headers=candidate_headers,
        )
        assert saved.status_code == 200
        assert saved.json()["status"] == "answered"

    completed = client.post(
        f"/api/exam/sessions/{exam_id}/complete",
        headers=candidate_headers,
    )
    assert completed.status_code == 200
    result = completed.json()
    assert result["status"] == "completed"
    assert result["overall_score"] == 77
    assert "Тестовая оценка экзамена" in (result["overall_feedback"] or "")


def test_exam_complete_without_answers_returns_400(
    client,
    candidate_headers,
) -> None:
    session_id = create_completed_diagnostic(client, candidate_headers)
    created = client.post(
        "/api/exam/sessions",
        json={"diagnostic_session_id": session_id},
        headers=candidate_headers,
    )
    exam_id = created.json()["id"]
    client.post(
        f"/api/exam/sessions/{exam_id}/start",
        headers=candidate_headers,
    )
    response = client.post(
        f"/api/exam/sessions/{exam_id}/complete",
        headers=candidate_headers,
    )
    assert response.status_code == 400
