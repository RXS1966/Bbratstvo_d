# app/routers/app2.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import json

app = FastAPI(title="Works showcase")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[2]   # .../Avatar
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = PUBLIC_DIR / "data"

def read_json(path: Path):
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bad JSON in {path.name}: {e}")

# API: расценки/работы
@app.get("/api/works")
def api_works():
    return read_json(DATA_DIR / "works.json")

# Страница витрины
@app.get("/")
def index():
    html = PUBLIC_DIR / "works.html"
    if not html.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {html}")
    return FileResponse(html)

# Статика (js/css) — ВАЖНО: НЕ на "/"
# В works.html подключай файлы так: /static/works.js, /static/works.css и т.п.
app.mount("/static", StaticFiles(directory=str(PUBLIC_DIR)), name="static")
