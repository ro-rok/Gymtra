@echo off
setlocal

cd /d "%~dp0backend"

if exist ".venv\Scripts\activate.bat" (
  call ".venv\Scripts\activate.bat"
) else if exist "venv\Scripts\activate.bat" (
  call "venv\Scripts\activate.bat"
) else if exist "env\Scripts\activate.bat" (
  call "env\Scripts\activate.bat"
) else (
  echo [ERROR] No virtual environment found in backend\(.venv^|venv^|env^)
  echo Create one first, e.g.:
  echo   py -m venv .venv
  exit /b 1
)

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
