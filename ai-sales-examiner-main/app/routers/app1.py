from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path
import re

app = FastAPI(title="App1 - Materials")

# Корень проекта ...\Avatar (потому что файл лежит в app/routers/)
BASE_DIR = Path(__file__).resolve().parents[2]
ASSETS_DIR = BASE_DIR / "public" / "assets"
MATERIALS_DIR = ASSETS_DIR / "materials"

# Статика: /assets/materials/<file>
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


def humanize(name: str) -> str:
    stem = Path(name).stem.lower().replace("_", "-")
    stem = re.sub(r"(\d+)\s*x\s*(\d+)", r"\1×\2", stem)
    stem = re.sub(r"(\d+)\s*m2\b", r"\1 м²", stem)
    stem = re.sub(r"(\d+)\s*kg\b", r"\1 кг", stem)
    title = " ".join([p for p in stem.split("-") if p])
    return title[:1].upper() + title[1:] if title else name


def _material_files():
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    if not MATERIALS_DIR.exists():
        return []
    return sorted([p for p in MATERIALS_DIR.iterdir() if p.is_file() and p.suffix.lower() in exts])


@app.get("/api/materials")
def list_materials():
    files = _material_files()
    return [
        {
            "id": p.name,
            "filename": p.name,
            "title": humanize(p.name),
            "image_url": f"/assets/materials/{p.name}",
        }
        for p in files
    ]


@app.get("/", response_class=HTMLResponse)
def showroom():
    # Простая витрина-галерея без фронта: чтобы "сама по себе" открывалась на /
    cards = []
    for p in _material_files():
        url = f"/assets/materials/{p.name}"
        title = humanize(p.name)
        cards.append(f"""
          <div class="card">
            <img src="{url}" alt="{title}">
            <div class="title">{title}</div>
            <div class="file">{p.name}</div>
          </div>
        """)

    html = f"""
    <!doctype html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Витрина материалов</title>
      <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ margin: 0 0 12px 0; }}
        .hint {{ color: #666; margin-bottom: 16px; }}
        .grid {{
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }}
        .card {{
          border: 1px solid #e5e5e5; border-radius: 12px;
          padding: 10px; background: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,.06);
        }}
        img {{ width: 100%; height: 200px; object-fit: contain; background: #fafafa; border-radius: 8px; }}
        .title {{ margin-top: 8px; font-weight: 600; }}
        .file {{ color: #777; font-size: 12px; word-break: break-all; }}
      </style>
    </head>
    <body>
      <h1>Витрина материалов</h1>
      <div class="hint">
        API: <a href="/api/materials" target="_blank">/api/materials</a>
      </div>
      <div class="grid">
        {''.join(cards) if cards else '<div>Нет файлов в public/assets/materials</div>'}
      </div>
    </body>
    </html>
    """
    return HTMLResponse(html)
