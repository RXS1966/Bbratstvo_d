# routers/avatar.py

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import requests

from app.core.config import settings

# Инициализируем роутер для стриминга аватара
router = APIRouter(prefix="/api/streaming", tags=["streaming"])


def _heygen_headers(token: str | None = None) -> dict:
    """
    Формируем заголовки запроса к HeyGen API.
    Если token передан — используем Bearer, иначе X-Api-Key.
    """
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        headers["X-Api-Key"] = settings.HEYGEN_API_KEY
    return headers


class SessionRequest(BaseModel):
    avatar_id: str | None = None
    voice_id: str | None = None
    quality: str = "medium"       # high / medium / low
    version: str = "v2"
    video_encoding: str = "H264"  # or VP8


class StartRequest(BaseModel):
    session_id: str


class TaskRequest(BaseModel):
    session_id: str               # ID текущей сессии
    text: str                     # Текст, который должен произнести аватар
    task_type: str = "repeat"     # repeat или chat
    task_mode: str = "sync"       # sync — ждать, async — не ждать


@router.post("/token")
async def create_streaming_token():
    """
    Получаем короткоживущий токен для работы со streaming API HeyGen.
    """
    url = f"{settings.HEYGEN_SERVER_URL}/v1/streaming.create_token"
    response = requests.post(url, headers=_heygen_headers())
    if response.ok:
        return response.json()["data"]  # { "token": "..." }
    raise HTTPException(status_code=response.status_code, detail=response.text)


@router.post("/session")
async def new_session(req: SessionRequest, token: str = Query(...)):
    """
    Создаём новую сессию аватара.
    """
    url = f"{settings.HEYGEN_SERVER_URL}/v1/streaming.new"
    payload = {
        "avatar_id": req.avatar_id or settings.AVATAR_ID,
        "voice": {"voice_id": req.voice_id or settings.VOICE_ID, "rate": 1.0},
        "quality": req.quality,
        "version": req.version,
        "video_encoding": req.video_encoding,
    }
    response = requests.post(
        url,
        headers=_heygen_headers(token=token),
        json=payload
    )
    if response.ok:
        return response.json()["data"]
    raise HTTPException(status_code=response.status_code, detail=response.text)


@router.post("/start")
async def start_streaming(req: StartRequest, token: str = Query(...)):
    """
    Запускаем сессию аватара.
    """
    url = f"{settings.HEYGEN_SERVER_URL}/v1/streaming.start"
    response = requests.post(
        url,
        headers=_heygen_headers(token=token),
        json=req.dict()
    )
    if response.ok:
        return response.json()["data"]
    raise HTTPException(status_code=response.status_code, detail=response.text)


@router.post("/task")
async def send_task(req: TaskRequest, token: str = Query(...)):
    """
    Отправляем текстовую задачу (speech task) в активную сессию.
    """
    print(f"[DEBUG] Got streaming.task: session_id={req.session_id!r}, text={req.text!r}")
    url = f"{settings.HEYGEN_SERVER_URL}/v1/streaming.task"
    response = requests.post(
        url,
        headers=_heygen_headers(token=token),
        json=req.dict()
    )
    if response.ok:
        return response.json()["data"]
    raise HTTPException(status_code=response.status_code, detail=response.text)


@router.post("/stop")
async def stop_streaming(req: StartRequest, token: str = Query(...)):
    """
    Останавливаем активную сессию аватара.
    """
    url = f"{settings.HEYGEN_SERVER_URL}/v1/streaming.stop"
    response = requests.post(
        url,
        headers=_heygen_headers(token=token),
        json=req.dict()
    )
    if response.ok:
        return {"status": "stopped"}
    raise HTTPException(status_code=response.status_code, detail=response.text)
