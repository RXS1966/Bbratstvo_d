"""Тесты llm_client: повторы при ошибках."""

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.services.llm_client import chat_completion


@pytest.fixture
def llm_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "http://llm.test/v1")
    monkeypatch.setenv("LLM_MODEL", "test-model")
    monkeypatch.setenv("LLM_MAX_RETRIES", "2")
    monkeypatch.setenv("LLM_RETRY_DELAY_SECONDS", "0")
    from app.config import get_settings

    get_settings.cache_clear()


def _ok_response() -> MagicMock:
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json.return_value = {
        "choices": [{"message": {"content": '{"ok": true}'}}]
    }
    return response


def test_chat_completion_retries_then_succeeds(llm_settings) -> None:
    post = MagicMock(side_effect=[httpx.TimeoutException("t"), _ok_response()])
    client_instance = MagicMock()
    client_instance.post = post
    client_instance.__enter__ = MagicMock(return_value=client_instance)
    client_instance.__exit__ = MagicMock(return_value=False)

    with patch("app.services.llm_client.httpx.Client", return_value=client_instance):
        result = chat_completion("prompt", system="sys", temperature=0.1)

    assert result == '{"ok": true}'
    assert post.call_count == 2


def test_chat_completion_returns_none_without_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "")
    from app.config import get_settings

    get_settings.cache_clear()
    assert chat_completion("p", system="s") is None
