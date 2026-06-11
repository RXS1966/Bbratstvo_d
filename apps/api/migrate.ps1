$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path .venv)) {
    Write-Error "Run first: python -m venv .venv"
    exit 1
}

& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -q

Write-Host "Checking PostgreSQL connection..." -ForegroundColor Cyan
$pyCheck = @'
from sqlalchemy import create_engine, text
from app.config import get_settings
engine = create_engine(get_settings().database_url, pool_pre_ping=True)
with engine.connect() as conn:
    conn.execute(text("SELECT 1"))
print("DB connection OK")
'@
$pyCheck | python -
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Database connection failed." -ForegroundColor Red
    Write-Host '  - docker compose up -d  (in Fronted/Variant_3)' -ForegroundColor Yellow
    Write-Host '  - .env port 5433 (not 5432; local Postgres often uses 5432)' -ForegroundColor Yellow
    Write-Host '  - docker ps: neuroexam-postgres should be Up' -ForegroundColor Yellow
    exit 1
}

alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Host "Migrations failed." -ForegroundColor Red
    exit 1
}

Write-Host "Migrations applied." -ForegroundColor Green
