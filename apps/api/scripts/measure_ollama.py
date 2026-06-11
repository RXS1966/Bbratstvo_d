"""Замер времени ответов Ollama (кейс, вопросы экзамена, batch-оценка)."""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.evaluation_service import (  # noqa: E402
    evaluate_case_answer,
    evaluate_exam_session_batch,
    generate_exam_questions,
)
from app.services.llm_client import chat_completion  # noqa: E402


def _sec(start: float) -> float:
    return round(time.perf_counter() - start, 1)


def main() -> None:
    print("=== Ollama timing (llama3.2) ===\n")
    run_start = time.perf_counter()
    timings: list[tuple[str, float]] = []

    t0 = time.perf_counter()
    ping = chat_completion(
        "Ответь одним словом: ок",
        system="Кратко.",
        temperature=0.0,
    )
    preview = repr(ping)[:50] if ping else "None"
    timings.append(("простой запрос", _sec(t0)))
    print(f"1. Простой запрос:     {timings[-1][1]} с  -> {preview}")

    t0 = time.perf_counter()
    case = evaluate_case_answer(
        role_title="Менеджер по продажам",
        context="B2B SaaS, цикл сделки 3 месяца",
        kpi_notes="конверсия, средний чек",
        case_title="Возражение по цене",
        case_brief="Клиент считает цену завышенной",
        materials="прайс",
        user_answer="Уточню потребности, покажу ROI, предложу пилот.",
    )
    timings.append(("оценка кейса", _sec(t0)))
    print(f"2. Оценка кейса:      {timings[-1][1]} с  score={case[0]}")

    t0 = time.perf_counter()
    questions = generate_exam_questions(
        role_title="Менеджер по продажам",
        context="B2B SaaS",
        kpi_notes="конверсия",
        case_summaries="Кейс: возражение по цене — отправлен.",
    )
    q_count = len(questions) if questions else 0
    timings.append(("вопросы экзамена", _sec(t0)))
    print(f"3. Вопросы экзамена:  {timings[-1][1]} с  count={q_count}")

    items = [
        (1, "Как вы работаете с KPI?", "Сверяю план-факт еженедельно."),
        (2, "Пример сложной сделки?", "Вёл переговоры 4 месяца, закрыл пилот."),
        (3, "Конфликт в команде?", "Медиация, фокус на цели."),
    ]
    if questions:
        items = [
            (i + 1, questions[i], items[i][2])
            for i in range(min(len(questions), len(items)))
        ]

    t0 = time.perf_counter()
    overall, evals = evaluate_exam_session_batch(
        role_title="Менеджер по продажам",
        context="B2B SaaS",
        kpi_notes="конверсия",
        items=items,
    )
    timings.append(("batch-оценка экзамена", _sec(t0)))
    print(
        f"4. Batch-оценка экзамена: {timings[-1][1]} с  "
        f"overall={overall} parts={len(evals)}"
    )

    llm_sum = sum(t for _, t in timings)
    wall = round(time.perf_counter() - run_start, 1)
    print(f"\nСумма LLM-операций: ~{llm_sum} с | всего скрипт: {wall} с")
    print("Полный путь кандидата (кейс+экзамен): ориентир ~2–3 мин.")
    print("\nГотово.")


if __name__ == "__main__":
    main()
