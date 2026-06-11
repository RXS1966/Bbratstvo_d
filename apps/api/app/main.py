import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db.session import SessionLocal
from app.routers import (
    auth,
    cases,
    diagnostic,
    exam,
    health,
    manager,
    results,
    sections,
)
from app.services import user_service

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.getenv("SKIP_USER_BOOTSTRAP") != "1":
        db = SessionLocal()
        try:
            user_service.ensure_demo_users(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title="Нейроэкзаменатор API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter()
api.include_router(health.router)
api.include_router(auth.router)
api.include_router(sections.router)
api.include_router(diagnostic.router)
api.include_router(cases.router)
api.include_router(exam.router)
api.include_router(results.router)
api.include_router(manager.router)
app.include_router(api, prefix=settings.api_prefix)


def _maybe_mount_frontend() -> None:
    dist = Path(__file__).resolve().parents[2] / "web" / "dist"
    if dist.is_dir():
        app.mount("/", StaticFiles(directory=dist, html=True), name="spa")


_maybe_mount_frontend()
