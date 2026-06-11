"""Генерация вопросов экзамена: LLM и fallback."""

from tests.conftest import create_completed_diagnostic


def test_exam_start_uses_llm_questions(
    client,
    candidate_headers,
    monkeypatch,
) -> None:
    def fake_generate(**_kwargs: object) -> list[str]:
        return [
            "LLM: как вы приоритизируете задачи?",
            "LLM: какие метрики возьмёте на 90 дней?",
            "LLM: пример сложного разговора с командой?",
        ]

    monkeypatch.setattr(
        "app.services.exam_service.generate_exam_questions",
        fake_generate,
    )
    session_id = create_completed_diagnostic(client, candidate_headers)
    created = client.post(
        "/api/exam/sessions",
        json={"diagnostic_session_id": session_id},
        headers=candidate_headers,
    )
    exam_id = created.json()["id"]
    started = client.post(
        f"/api/exam/sessions/{exam_id}/start",
        headers=candidate_headers,
    )
    assert started.status_code == 200
    texts = [q["question_text"] for q in started.json()["questions"]]
    assert texts[0].startswith("LLM:")


def test_exam_start_fallback_to_templates(
    client,
    candidate_headers,
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "app.services.exam_service.generate_exam_questions",
        lambda **_kwargs: None,
    )
    session_id = create_completed_diagnostic(client, candidate_headers)
    created = client.post(
        "/api/exam/sessions",
        json={"diagnostic_session_id": session_id},
        headers=candidate_headers,
    )
    exam_id = created.json()["id"]
    started = client.post(
        f"/api/exam/sessions/{exam_id}/start",
        headers=candidate_headers,
    )
    assert started.status_code == 200
    first = started.json()["questions"][0]["question_text"]
    assert "подход к ключевой задаче" in first
