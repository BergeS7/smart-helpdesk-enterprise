@echo off
setlocal
cd /d "%~dp0"
if not exist .env (
  copy /Y .env.docker.example .env >nul
  echo Arquivo .env criado.
  echo Preencha POSTGRES_PASSWORD, JWT_SECRET e ALLOWED_ORIGINS antes de iniciar.
  echo O sistema nao inicia com segredos vazios ou inseguros.
  pause
  exit /b 0
)
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo Falha ao iniciar. Verifique se o Docker Desktop esta aberto.
  pause
  exit /b 1
)
echo.
echo Smart HelpDesk iniciado em http://localhost:8090
pause
