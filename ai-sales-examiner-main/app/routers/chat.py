# routers/chat.py

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import AsyncOpenAI
import httpx
from typing import Dict, List
from pathlib import Path
import re

from app.core.config import settings
from app.core.conclusion_manager import ConclusionManager

# === мини-сторож (анти-повторы и ≤2 фразы) ===
_SPLIT = re.compile(r'(?<=[.!?…])\s+')
_INTRO = re.compile(r'(?is)^\s*(я\s+практикующ(ий|его)\s+психолог|я\s+психолог|я\s+нейропсихолог)[^.?!]*[.?!]*\s*')
_ASK_NAME = re.compile(r'(?i)(как\s+вас\s+зовут|назов(и|ите)\s+имя)')
_ASK_PRIV = re.compile(r'(?i)(удобн\w+\s+ли\s+сейчас\s+говорить|без\s+посторонних)')
_SPEAKS_FOR_USER = re.compile(r'(?im)^(пользователь|клиент)\s*:\s*.*$')

def _two_sentences(t: str) -> str:
    t = re.sub(r'\s*\[STOP\]\s*$', '', (t or '').strip(), flags=re.I)
    t = _SPEAKS_FOR_USER.sub('', t).strip()
    parts = _SPLIT.split(t)
    return ' '.join(parts[:2]).strip()

def _strip_intro(t: str, greeted: bool) -> str:
    return _INTRO.sub('', t).strip() if greeted else t

def _drop_redundant(t: str, name_known: bool, privacy_ok: bool) -> str:
    if name_known: t = _ASK_NAME.sub('', t)
    if privacy_ok: t = _ASK_PRIV.sub('', t)
    return re.sub(r'\s{2,}', ' ', t).strip()


router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    avatar_token: str | None = None
    session_id: str | None = None
    user_session_id: str | None = None  # ID сессии пользователя для истории

class StartDialogRequest(BaseModel):
    user_session_id: str | None = None  # ID сессии пользователя для истории

class ChatMessage(BaseModel):
    role: str  # "user" или "assistant"
    content: str

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Простое хранение истории и состояния в памяти (в продакшене — Redis/БД)
chat_histories: Dict[str, List[ChatMessage]] = {}
chat_states: Dict[str, Dict[str, str | bool]] = {}  # {sid: {"greeted": bool, "privacy_ok": bool, "name": str}}

# Менеджер заключений
conclusion_manager = ConclusionManager()

def load_psychologist_prompt() -> str:
    """Загружает промпт психолога из файла"""
    prompt_path = Path("prompts/psychologist_prompt.md")
    if prompt_path.exists():
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    else:
        # Fallback промпт
        return "Вы — Пётр Павел Сурков, практикующий психолог. Проведите консультацию по методике двух шагов."

def _get_state(sid: str) -> Dict[str, str | bool]:
    st = chat_states.get(sid)
    if not st:
        st = {"greeted": False, "privacy_ok": False, "name": ""}
        chat_states[sid] = st
    return st

@router.post("")
async def chat(req: ChatRequest, request: Request):
    buffer = ""
    full_response = ""
    sentences: List[str] = []

    # Загружаем промпт из файла
    MEGA_PROMPT = load_psychologist_prompt()

    # Получаем или создаем историю и состояние для пользователя
    user_session_id = req.user_session_id or "default"
    if user_session_id not in chat_histories:
        chat_histories[user_session_id] = []
    state = _get_state(user_session_id)

    # Обновляем флаги состояния по реплике пользователя
    user_text = req.message or ""
    if re.search(r'(удобно|без\s+посторонних|могу\s+говорить)', user_text, re.I):
        state["privacy_ok"] = True
    m = re.search(r'меня\s+зовут\s+([А-ЯA-ZЁ][а-яa-zё\-]+)', user_text, re.I)
    if m:
        state["name"] = m.group(1)

    # Формируем сообщения для ChatGPT
    messages = [{"role": "system", "content": MEGA_PROMPT}]

    # Лёгкие подсказки модели из состояния (не повторять одно и то же)
    hints: List[str] = ["Отвечай максимум двумя короткими предложениями. Не говори от имени пользователя."]
    if state.get("greeted"):
        hints.append("Приветствие уже было — не повторяй самопрезентацию.")
    if state.get("privacy_ok"):
        hints.append("Приватность подтверждена — не спрашивай об этом повторно.")
    if state.get("name"):
        hints.append(f"Имя пользователя: {state['name']} — не спрашивай имя повторно.")
    if hints:
        messages.append({"role": "system", "content": " ".join(hints)})

    # Добавляем историю диалога
    for msg in chat_histories[user_session_id]:
        messages.append({"role": msg.role, "content": msg.content})

    # Если это первое сообщение в диалоге, добавляем «старт»
    if len(chat_histories[user_session_id]) == 0:
        messages.append({"role": "user", "content": "Начни диалог с приветствия и представления"})

    # Добавляем текущее сообщение пользователя
    messages.append({"role": "user", "content": req.message})

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True,
            temperature=0.2,
            top_p=0.85,
            frequency_penalty=0.6,
            presence_penalty=0.2,
        )

        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            buffer += delta
            full_response += delta

            # Проверяем наличие конца предложения
            while "." in buffer or "?" in buffer or "!" in buffer:
                for sep in [".", "?", "!"]:
                    idx = buffer.find(sep)
                    if idx != -1:
                        sentence = buffer[:idx+1].strip()
                        sentences.append(sentence)

                        # Стримим в аватар, но не шлём «самопрезентацию», если уже были приветствия
                        if req.avatar_token and req.session_id:
                            if not (state.get("greeted") and _INTRO.match(sentence or "")):
                                await send_to_avatar(req.avatar_token, req.session_id, sentence)

                        buffer = buffer[idx+1:].lstrip()
                        break

        # Отправим остаток (если конец без знака)
        if buffer.strip():
            tail = buffer.strip()
            sentences.append(tail)
            if req.avatar_token and req.session_id:
                if not (state.get("greeted") and _INTRO.match(tail or "")):
                    await send_to_avatar(req.avatar_token, req.session_id, tail)

        # Сохраняем историю диалога (сырой ответ от модели до пост-обработки)
        chat_histories[user_session_id].append(ChatMessage(role="user", content=req.message))
        # Пост-обработка для хранения и ответа клиенту
        cleaned = _strip_intro(full_response, greeted=bool(state.get("greeted")))
        cleaned = _drop_redundant(cleaned, name_known=bool(state.get("name")), privacy_ok=bool(state.get("privacy_ok")))
        cleaned = _two_sentences(cleaned)

        chat_histories[user_session_id].append(ChatMessage(role="assistant", content=cleaned))

        # После первого ответа считаем, что приветствие уже было
        if not state.get("greeted"):
            state["greeted"] = True

        # Проверяем, завершен ли диалог
        current_history = [{"role": msg.role, "content": msg.content} for msg in chat_histories[user_session_id]]

        if conclusion_manager.is_dialog_completed(current_history, user_session_id):
            print(f"[DEBUG] Диалог завершен для сессии {user_session_id}")
            try:
                conclusion = await conclusion_manager.create_conclusion(current_history, user_session_id)
                conclusion_path = conclusion_manager.save_conclusion(conclusion, user_session_id)
                print(f"[DEBUG] Заключение сохранено: {conclusion_path}")
            except Exception as e:
                print(f"[ERROR] Ошибка при создании заключения: {e}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")

    return {"response": cleaned}


@router.post("/clear-history")
async def clear_chat_history(req: StartDialogRequest):
    """Очищает историю чата для пользователя"""
    user_session_id = req.user_session_id or "default"

    if user_session_id in chat_histories:
        chat_histories[user_session_id] = []
        # сбрасываем состояние
        chat_states[user_session_id] = {"greeted": False, "privacy_ok": False, "name": ""}
        conclusion_manager.clear_session(user_session_id)
        print(f"[DEBUG] Cleared history for session: {user_session_id}")
    else:
        print(f"[DEBUG] Session not found: {user_session_id}")

    # Дополнительно очищаем все пустые сессии
    sessions_to_remove = []
    for session_id, history in chat_histories.items():
        if len(history) == 0:
            sessions_to_remove.append(session_id)

    for session_id in sessions_to_remove:
        del chat_histories[session_id]
        chat_states.pop(session_id, None)
        conclusion_manager.clear_session(session_id)
        print(f"[DEBUG] Removed empty session: {session_id}")

    return {"status": "cleared", "sessions_removed": len(sessions_to_remove)}


@router.post("/clear-all-history")
async def clear_all_chat_history():
    """Очищает ВСЮ историю чата (для отладки)"""
    global chat_histories, chat_states
    old_count = len(chat_histories)
    chat_histories = {}
    chat_states = {}
    print(f"[DEBUG] Cleared ALL history. Removed {old_count} sessions")
    return {"status": "all_cleared", "sessions_removed": old_count}


@router.get("/dialog-status/{user_session_id}")
async def get_dialog_status(user_session_id: str):
    """Проверяет статус диалога для пользователя"""
    if user_session_id not in chat_histories:
        return {"status": "not_found", "is_completed": False}

    current_history = [{"role": msg.role, "content": msg.content} for msg in chat_histories[user_session_id]]
    is_completed = conclusion_manager.is_dialog_completed(current_history, user_session_id)
    summary = conclusion_manager.get_dialog_summary(current_history)

    return {
        "status": "found",
        "is_completed": is_completed,
        "summary": summary
    }


@router.post("/start-dialog")
async def start_dialog(req: StartDialogRequest):
    """Инициирует диалог с психологом (приветствие)"""
    user_session_id = req.user_session_id or "default"

    # Если диалог уже начат — ошибка
    if user_session_id in chat_histories and len(chat_histories[user_session_id]) > 0:
        return {"error": "Диалог уже начат", "response": ""}

    # Сбрасываем состояние
    chat_states[user_session_id] = {"greeted": False, "privacy_ok": False, "name": ""}

    # Загружаем промпт
    MEGA_PROMPT = load_psychologist_prompt()

    messages = [
        {"role": "system", "content": MEGA_PROMPT},
        {"role": "user", "content": "Начни диалог с приветствия и представления"}
    ]

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True,
            temperature=0.2,
            top_p=0.85,
            frequency_penalty=0.6,
            presence_penalty=0.2,
        )

        full_response = ""
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            full_response += delta

        # Пост-обработка приветствия
        cleaned = _two_sentences(_strip_intro(full_response, greeted=False))
        chat_histories.setdefault(user_session_id, [])
        chat_histories[user_session_id].append(ChatMessage(role="assistant", content=cleaned))

        return {"response": cleaned}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")


async def send_to_avatar(token, session_id, text):
    url = f"{settings.HEYGEN_SERVER_URL}/v1/streaming.task"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "session_id": session_id,
        "text": text,
        "task_type": "repeat",
        "task_mode": "sync"
    }
    async with httpx.AsyncClient() as client_http:
        r = await client_http.post(url, headers=headers, json=payload)
        if not r.is_success:
            print(f"Не удалось отправить текст аватару: {r.status_code} {r.text}")


