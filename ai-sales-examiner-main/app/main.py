# app/main.py
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routers.avatar import router as avatar_router
from app.routers.chat import router as chat_router
from app.routers.transcribe import router as transcribe_router

# ✅ sub-apps (витрины)
from app.routers.app1 import app as materials_app   # /materials
from app.routers.app2 import app as works_app       # /works

from app.routers.tts import router as tts_router

# ============================================================
# APP
# ============================================================
app = FastAPI(title="Avatar Chat + HeyGen Streaming")

# from app.routers.tts import router as tts_router
# сapp.include_router(tts_router)

# ============================================================
# PATHS
# ============================================================
BASE_DIR = Path(__file__).resolve().parents[1]     # Avatar/
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = PUBLIC_DIR / "data"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

def read_json_file(filename: str):
    p = DATA_DIR / filename
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {p}")
    raw = p.read_text(encoding="utf-8").strip()
    if not raw:
        return {}
    return json.loads(raw)

def _safe_name(name: str) -> str:
    name = (name or "").strip().replace("\0", "")
    name = name.split("/")[-1].split("\\")[-1]
    return name if name.endswith(".json") else name + ".json"

async def _save_report(req: Request):
    try:
        data = await req.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "invalid json"}, status_code=400)

    fname = _safe_name(data.get("filename") or f"dialog-{datetime.now():%Y-%m-%d_%H-%M-%S}.json")
    payload = data.get("payload", {})

    fpath = REPORTS_DIR / fname
    try:
        with fpath.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return {"ok": True, "filename": fname}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)

# ============================================================
# CORS
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ROUTERS
# ============================================================
app.include_router(chat_router)
app.include_router(avatar_router)
app.include_router(transcribe_router)
app.include_router(tts_router)

# ============================================================
# API: HOUSES / CATALOG (для "Дома")
# ============================================================
@app.get("/api/catalog", tags=["catalog"])
def api_catalog():
    # дома/проекты берём из public/data/catalog.json
    data = read_json_file("catalog.json")

    # поддержим форматы: list, {items:[]}, {data:[]}
    if isinstance(data, list):
        return {"items": data}
    if isinstance(data, dict):
        if isinstance(data.get("items"), list):
            return {"items": data["items"]}
        if isinstance(data.get("data"), list):
            return {"items": data["data"]}
    return {"items": []}

# ============================================================
# API: REPORT
# ============================================================
@app.post("/api/report", tags=["report"])
async def save_report(req: Request):
    return await _save_report(req)

@app.post("/report", tags=["report"])
async def save_report_alias(req: Request):
    return await _save_report(req)

# ============================================================
# SUB-APPS: витрины отдельными модулями (как ты и хочешь)
# ============================================================
# материалы -> http://127.0.0.1:8000/materials
app.mount("/materials", materials_app)

# расценки/работы -> http://127.0.0.1:8000/works
app.mount("/works", works_app)

# ============================================================
# STATIC (FRONTEND)
# ============================================================
app.mount("/public", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="public")
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
