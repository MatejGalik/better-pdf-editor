@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Pripravujem prostredie, prvy start chvilu trva...
  python -m venv .venv || (echo Chyba: Python nie je nainstalovany. & pause & exit /b 1)
  ".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt || (pause & exit /b 1)
)
".venv\Scripts\python.exe" server.py
pause
