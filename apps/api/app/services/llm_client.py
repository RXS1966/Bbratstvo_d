"""Клиент OpenAI-compatible chat/completions с повторами запросов."""
from __future__ import annotations

import time

import httpx

from app.config import get_settings


def is_llm_configured() -> bool:
    return get_settings().llm_configured


def chat_completion(
    prompt: str,
    *,
    system: str,
    temperature: float = 0.3,
) -> str | None:
    """
    Вызов LLM. При сетевой ошибке или таймауте — повторы.

    Возвращает текст ответа или None (нет ключа, исчерпаны попытки).
    """
    settings = get_settings()
    if settings.disable_llm:
        return None
    if not settings.openai_api_key.strip():
        return None

    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.llm_model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    attempts = settings.llm_max_retries + 1
    delay = settings.llm_retry_delay_seconds

    timeout = httpx.Timeout(
        connect=10.0,
        read=float(settings.llm_timeout_seconds),
        write=float(settings.llm_timeout_seconds),
        pool=10.0,
    )
    for attempt in range(attempts):
        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                body = response.json()
            content = body["choices"][0]["message"]["content"]
            if not isinstance(content, str) or not content.strip():
                return None
            return content.strip()
        except (
            httpx.HTTPError,
            httpx.TimeoutException,
            KeyError,
            ValueError,
            TypeError,
        ):
            if attempt >= attempts - 1:
                return None
            time.sleep(delay)
    return None
