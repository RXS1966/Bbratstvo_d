"""Тесты /api/results (срез + кейс + экзамен)."""

from tests.conftest import create_completed_diagnostic


def test_result_detail_includes_exam(client, candidate_headers) -> None:
    session_id = create_completed_diagnostic(client, candidate_headers)

    case = client.post(
        "/api/cases",
        json={
            "diagnostic_session_id": session_id,
            "title": "Кейс",
            "brief": "Условие",
            "materials": "",
        },
        headers=candidate_headers,
    )
    case_id = case.json()["id"]
    client.post(
        f"/api/cases/{case_id}/submit",
        json={"user_answer": "Ответ на кейс."},
        headers=candidate_headers,
    )

    exam = client.post(
        "/api/exam/sessions",
        json={"diagnostic_session_id": session_id},
        headers=candidate_headers,
    )
    exam_id = exam.json()["id"]
    started = client.post(
        f"/api/exam/sessions/{exam_id}/start",
        headers=candidate_headers,
    )
    for question in started.json()["questions"]:
        client.patch(
            f"/api/exam/sessions/{exam_id}/questions/{question['id']}/answer",
            json={"user_answer": "Ответ."},
            headers=candidate_headers,
        )
    client.post(
        f"/api/exam/sessions/{exam_id}/complete",
        headers=candidate_headers,
    )

    detail = client.get(
        f"/api/results/{session_id}",
        headers=candidate_headers,
    )
    assert detail.status_code == 200
    body = detail.json()
    assert body["cases_submitted"] == 1
    assert body["exams_completed"] == 1
    assert body["exam_progress_label"].startswith("Экзамен:")
    assert len(body["exams"]) == 1
    assert body["exams"][0]["overall_score"] == 77

    listed = client.get("/api/results", headers=candidate_headers)
    assert listed.status_code == 200
    row = next(r for r in listed.json() if r["session_id"] == session_id)
    assert row["exams_total"] == 1
    assert row["exams_completed"] == 1
