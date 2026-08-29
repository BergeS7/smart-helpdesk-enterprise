@echo off
REM Responsabilidade: encerra a stack Docker do Smart HelpDesk de forma controlada.
setlocal
cd /d "%~dp0"
docker compose down
if errorlevel 1 (
  echo Falha ao parar os containers.
  pause
  exit /b 1
)
echo Containers encerrados. Os dados foram preservados.
pause
