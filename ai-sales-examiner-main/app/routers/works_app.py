# app/routers/works_app.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json

app = FastAPI(title="Works Panel")

BASE_DIR = Path(__file__).resolve().parents[2]      # .../Avatar
PUBLIC_DIR = BASE_DIR / "public"                    # .../Avatar/public
DATA_DIR = PUBLIC_DIR / "data"                      # .../Avatar/public/data

def read_json(path: Path):
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))

# API
@app.get("/api/works")
def api_works():
    return JSONResponse(read_json(DATA_DIR / "works.json"))

# UI (страница панели)
@app.get("/", response_class=HTMLResponse)
def works_page():
    html_path = PUBLIC_DIR / "works.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {html_path}")
    return HTMLResponse(html_path.read_text(encoding="utf-8"))

# Статика (css/js/assets)
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="public")
