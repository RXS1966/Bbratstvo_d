# app/routers/transcribe.py
from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from io import BytesIO
from typing import Final

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from openai import OpenAI
# from pydub import AudioSegment
# from pydub.silence import detect_silence

from app.core.config import settings

import difflib

# Настройка логгера
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

router = APIRouter(prefix="/api/transcribe", tags=["transcribe"])
client: Final = OpenAI(api_key=settings.OPENAI_API_KEY)

MODEL_NAME: Final = "gpt-4o-mini-transcribe"
BASE_PROMPT: Final = "Ты Нейро-психолог, разговариваешь по-русски. Отвечаешь кратко."

# Параметры фильтрации/флашинга
# MIN_SEGMENT_BYTES: Final = 1024          # ↓ Было 16384 — теперь не режем короткие ответы
# SILENCE_THRESH_DB: Final = -25.0
# MIN_SILENCE_LEN_MS: Final = 500

# Параметры фильтрации/флашинга
MIN_SEGMENT_BYTES: Final = 2048     # минимальный размер буфера (~64 мс для 16kHz mono)
SILENCE_THRESH_DB: Final = -45.0    # «тише -45 dBFS» считаем тишиной (менее агрессивно, чем -25)
MIN_SILENCE_LEN_MS: Final = 500     # длительность тишины для фиксации границы фразы


# ---------------------------------------------------------------------------
# WebSocket-стриминг
# ---------------------------------------------------------------------------
@router.websocket("/ws")
async def transcribe_stream(ws: WebSocket):
    await ws.accept()
    logger.info("WS connected: %s", ws.client)

    buf = BytesIO()
    prev_text = ""

    # async def is_silent(audio_bytes: bytes) -> bool:
    #     # Проверка тишины через pydub (оставляем на этом этапе; уберём на шаге 3)
    #     with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
    #         tmp.write(audio_bytes)
    #         tmp.flush()
    #         tmp_path = tmp.name
    #     try:
    #         seg = AudioSegment.from_file(tmp_path)
    #         seg = seg.set_channels(1)
    #         silent_spans = detect_silence(
    #             seg,
    #             min_silence_len=MIN_SILENCE_LEN_MS,
    #             silence_thresh=SILENCE_THRESH_DB
    #         )
            # Если вся запись тишина — считаем тихим сегментом
        #     if silent_spans and len(silent_spans) == 1:
        #         s, e = silent_spans[0]
        #         if (e - s) >= len(seg):
        #             return True
        #     return False
        # finally:
        #     try:
        #         os.remove(tmp_path)
        #     except OSError:
        #         pass

    async def flush(*, final: bool) -> None:
        nonlocal prev_text, buf
        size = buf.getbuffer().nbytes

        if size < MIN_SEGMENT_BYTES:
            logger.debug("Пропускаем очень короткий сегмент (%d байт)", size)
            buf.truncate(0); buf.seek(0)
            return

        part_bytes = buf.getvalue()
        buf.truncate(0); buf.seek(0)

        # При желании — отсекаем «полную тишину»
        # try:
        #     if await is_silent(part_bytes):
        #         logger.debug("Пропускаем тихий сегмент после проверки pydub (%d байт)", size)
        #         return
        # except Exception:
        #     # Не блокируем пайплайн, если проверка тишины упала
        #     logger.exception("is_silent() error, продолжаем без фильтра")

        # Транскрибируем накопленный webm-кусок
        part = BytesIO(part_bytes)
        part.name = "segment.webm"
        logger.info("Отправляем %s chunk (bytes=%d)", "final" if final else "partial", size)

        try:
            resp = await asyncio.to_thread(
                client.audio.transcriptions.create,
                model=MODEL_NAME,
                file=part,
                prompt=BASE_PROMPT,
            )
            text = (resp.text or "").strip()

            # Защита от эха prompt
            similarity = difflib.SequenceMatcher(None, text.lower(), BASE_PROMPT.lower()).ratio()
            if similarity > 0.8:
                logger.debug("Транскрипция ≈ prompt (%.2f), пропускаем", similarity)
                return

            prev_text = f"{prev_text} {text}".strip()
            if ws.application_state == WebSocketState.CONNECTED and text:
                await ws.send_json({"type": "final" if final else "partial", "text": text})
                logger.debug("Отправлен результат (%s): %s", "final" if final else "partial", text)

        except WebSocketDisconnect:
            logger.warning("Разрыв соединения во время отправки результата")
        except Exception:
            logger.exception("Ошибка транскрипции во время отправки")
            if ws.application_state == WebSocketState.CONNECTED:
                await ws.send_json({"type": "error", "text": "Ошибка транскрипции"})

    # Основной цикл
    try:
        while True:
            msg = await ws.receive()

            # 1) Аудио-чанки (Blob с фронта)
            if (chunk := msg.get("bytes")) is not None:
                buf.write(chunk)
                continue

            # 2) Маркер окончания фразы (тишина по VAD на фронте)
            if msg.get("text") == "idle":
                await flush(final=True)
                continue

            # 3) Закрытие соединения
            if msg.get("type") == "websocket.disconnect":
                break

    except WebSocketDisconnect:
        logger.info("WS disconnected: %s", ws.client)
    finally:
        logger.info("Closing WS: %s", ws.client)

