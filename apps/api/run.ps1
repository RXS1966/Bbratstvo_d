$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path .venv)) {
    python -m venv .venv
}

& .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}

& "$PSScriptRoot\migrate.ps1"
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "API: http://localhost:8000/api/docs" -ForegroundColor Green
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
