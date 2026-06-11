"""Оценка кейсов и экзамена через LLM (промпты и разбор JSON)."""
from __future__ import annotations

import json
import re
from typing import Any

from app.services.llm_client import chat_completion, is_llm_configured

FEEDBACK_NO_API_KEY = (
    "Оценка LLM недоступна: укажите OPENAI_API_KEY в apps/api/.env "
    "и перезапустите API."
)

EXAM_QUESTION_COUNT = 3


def _build_prompt(
    role_title: str,
    context: str,
    kpi_notes: str,
    case_title: str,
    case_brief: str,
    materials: str,
    user_answer: str,
) -> str:
    kpi_block = kpi_notes.strip() or "не указаны"
    materials_block = materials.strip() or "нет"
    return f"""Ты эксперт по оценке персонала (HR). Оцени ответ кандидата на кейс.

Контекст среза:
- Роль: {role_title}
- Ситуация: {context}
- KPI: {kpi_block}

Кейс:
- Название: {case_title}
- Условие: {case_brief}
- Материалы: {materials_block}

Ответ кандидата:
{user_answer}

Верни ТОЛЬКО валидный JSON без markdown:
{{"score": <целое 0-100>, "feedback": "<краткая обратная связь на русском, 2-4 предложения>"}}

Критерии: релевантность, структура, практичность, учёт контекста и KPI."""


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    return json.loads(cleaned)


def _parse_evaluation(content: str) -> tuple[int, str]:
    data = _extract_json(content)
    score_raw = data.get("score")
    feedback_raw = data.get("feedback")
    if feedback_raw is None or not str(feedback_raw).strip():
        raise ValueError("В ответе LLM нет поля feedback")
    score = int(score_raw)
    if score < 0:
        score = 0
    if score > 100:
        score = 100
    return score, str(feedback_raw).strip()


def evaluate_case_answer(
    role_title: str,
    context: str,
    kpi_notes: str,
    case_title: str,
    case_brief: str,
    materials: str,
    user_answer: str,
) -> tuple[int, str]:
    if not is_llm_configured():
        return 0, FEEDBACK_NO_API_KEY

    prompt = _build_prompt(
        role_title,
        context,
        kpi_notes,
        case_title,
        case_brief,
        materials,
        user_answer,
    )
    content = chat_completion(
        prompt,
        system="Ты оцениваешь ответы кандидатов. Отвечай только JSON.",
        temperature=0.3,
    )
    if content is None:
        return (
            0,
            "Не удалось получить оценку LLM. Проверьте ключ API и модель в .env.",
        )
    try:
        return _parse_evaluation(content)
    except (ValueError, json.JSONDecodeError) as exc:
        return (
            0,
            f"Не удалось разобрать ответ LLM: {exc}.",
        )


def _build_exam_prompt(
    role_title: str,
    context: str,
    kpi_notes: str,
    question_text: str,
    user_answer: str,
) -> str:
    kpi_block = kpi_notes.strip() or "не указаны"
    return f"""Ты экзаменатор HR. Оцени устный ответ кандидата на вопрос финального экзамена.

Контекст среза:
- Роль: {role_title}
- Ситуация: {context}
- KPI: {kpi_block}

Вопрос экзаменатора:
{question_text}

Ответ кандидата:
{user_answer}

Верни ТОЛЬКО валидный JSON без markdown:
{{"score": <целое 0-100>, "feedback": "<краткая обратная связь на русском, 2-3 предложения>"}}

Критерии: глубина, структура, релевантность роли, практичность."""


def _build_generate_exam_prompt(
    role_title: str,
    context: str,
    kpi_notes: str,
    case_summaries: str,
) -> str:
    kpi_block = kpi_notes.strip() or "не указаны"
    return f"""Ты экзаменатор HR. Составь ровно {EXAM_QUESTION_COUNT} вопроса \
для финального устного экзамена кандидата.

Контекст среза:
- Роль: {role_title}
- Ситуация: {context}
- KPI: {kpi_block}

{case_summaries}

Требования к вопросам:
- на русском, по 1–2 предложения каждый;
- разные темы: практика по роли, метрики/KPI, поведение в команде;
- опирайся на контекст и кейсы, если они есть.

Верни ТОЛЬКО валидный JSON без markdown:
{{"questions": ["вопрос 1", "вопрос 2", "вопрос 3"]}}"""


def _parse_exam_questions(content: str) -> list[str]:
    data = _extract_json(content)
    raw = data.get("questions")
    if not isinstance(raw, list):
        raise ValueError("В ответе LLM нет массива questions")
    questions = [str(item).strip() for item in raw if str(item).strip()]
    if len(questions) < EXAM_QUESTION_COUNT:
        raise ValueError("Недостаточно вопросов в ответе LLM")
    return questions[:EXAM_QUESTION_COUNT]


def generate_exam_questions(
    role_title: str,
    context: str,
    kpi_notes: str,
    case_summaries: str = "",
) -> list[str] | None:
    """Вопросы экзамена через LLM. None — использовать шаблоны в exam_service."""
    prompt = _build_generate_exam_prompt(
        role_title,
        context,
        kpi_notes,
        case_summaries.strip()
        or "Отправленные кейсы: нет (кандидат ещё не сдавал кейсы).",
    )
    content = chat_completion(
        prompt,
        system=(
            "Ты экзаменатор HR. Составляешь вопросы для экзамена. "
            "Отвечай только JSON."
        ),
        temperature=0.5,
    )
    if content is None:
        return None
    try:
        return _parse_exam_questions(content)
    except (ValueError, json.JSONDecodeError):
        return None


def _build_exam_batch_prompt(
    role_title: str,
    context: str,
    kpi_notes: str,
    items: list[tuple[int, str, str]],
) -> str:
    """items: (sort_order, question_text, user_answer)."""
    kpi_block = kpi_notes.strip() or "не указаны"
    blocks = []
    for order, question, answer in items:
        blocks.append(
            f"Вопрос {order}:\n{question}\n\nОтвет кандидата:\n{answer}\n"
        )
    qa_block = "\n---\n".join(blocks)
    count = len(items)
    return f"""Ты экзаменатор HR. Оцени все ответы кандидата на финальном экзамене \
одним проходом.

Контекст среза:
- Роль: {role_title}
- Ситуация: {context}
- KPI: {kpi_block}

{qa_block}

Верни ТОЛЬКО валидный JSON без markdown:
{{"overall_score": <целое 0-100, среднее по вопросам>,
 "evaluations": [
   {{"score": <0-100>, "feedback": "<2-3 предложения на русском>"}},
   ... ровно {count} элементов в том же порядке
 ]}}

Критерии: глубина, структура, релевантность роли, практичность."""


def _parse_exam_batch(content: str, expected: int) -> tuple[int, list[tuple[int, str]]]:
    data = _extract_json(content)
    overall_raw = data.get("overall_score")
    evaluations_raw = data.get("evaluations")
    if not isinstance(evaluations_raw, list):
        raise ValueError("В ответе LLM нет массива evaluations")
    parsed: list[tuple[int, str]] = []
    for item in evaluations_raw[:expected]:
        if not isinstance(item, dict):
            raise ValueError("Некорректный элемент evaluations")
        score = int(item.get("score", 0))
        if score < 0:
            score = 0
        if score > 100:
            score = 100
        feedback = str(item.get("feedback", "")).strip()
        if not feedback:
            raise ValueError("Пустой feedback в evaluations")
        parsed.append((score, feedback))
    if len(parsed) < expected:
        raise ValueError("Недостаточно оценок в ответе LLM")
    overall = int(overall_raw) if overall_raw is not None else 0
    if overall < 0:
        overall = 0
    if overall > 100:
        overall = 100
    if overall == 0 and parsed:
        overall = round(sum(s for s, _ in parsed) / len(parsed))
    return overall, parsed


def evaluate_exam_session_batch(
    role_title: str,
    context: str,
    kpi_notes: str,
    items: list[tuple[int, str, str]],
) -> tuple[int, list[tuple[int, str]]]:
    """Одна оценка экзамена: overall + список (score, feedback) по вопросам."""
    if not items:
        return 0, []
    if not is_llm_configured():
        fallback = (0, FEEDBACK_NO_API_KEY)
        return 0, [fallback] * len(items)

    prompt = _build_exam_batch_prompt(role_title, context, kpi_notes, items)
    content = chat_completion(
        prompt,
        system="Ты экзаменатор HR. Отвечай только JSON.",
        temperature=0.3,
    )
    if content is None:
        fallback = (0, FEEDBACK_NO_API_KEY)
        return 0, [fallback] * len(items)
    try:
        return _parse_exam_batch(content, len(items))
    except (ValueError, json.JSONDecodeError) as exc:
        fallback = (
            0,
            f"Не удалось разобрать ответ LLM: {exc}.",
        )
        return 0, [fallback] * len(items)


def evaluate_exam_answer(
    role_title: str,
    context: str,
    kpi_notes: str,
    question_text: str,
    user_answer: str,
) -> tuple[int, str]:
    if not is_llm_configured():
        return 0, FEEDBACK_NO_API_KEY

    prompt = _build_exam_prompt(
        role_title,
        context,
        kpi_notes,
        question_text,
        user_answer,
    )
    content = chat_completion(
        prompt,
        system="Ты экзаменатор HR. Отвечай только JSON.",
        temperature=0.3,
    )
    if content is None:
        return 0, FEEDBACK_NO_API_KEY
    try:
        return _parse_evaluation(content)
    except (ValueError, json.JSONDecodeError) as exc:
        return (
            0,
            f"Не удалось получить оценку LLM: {exc}. "
            "Проверьте ключ API и модель в .env.",
        )
