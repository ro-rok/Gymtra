@echo off
setlocal

cd /d "%~dp0frontend"

if exist "package-lock.json" (
  npm run dev
) else (
  echo [ERROR] package-lock.json not found in frontend\
  echo Install dependencies first with: npm install
  exit /b 1
)
