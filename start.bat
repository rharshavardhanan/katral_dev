@echo off
:: start.bat — Start everything locally (MongoDB, .NET backend, Next.js frontend)
:: Usage: start.bat
:: Stop:  Close this window or Ctrl+C, then run stop.bat

setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
:: Remove trailing backslash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "FRONTEND=%ROOT%\frontend\edu-web"
set "BACKEND=%ROOT%\backend\EduPlatform.Api"

:: ── Colours (requires Windows 10+ with VT100 support) ────────────────────────
for /f %%a in ('echo prompt $E^| cmd /Q') do set "ESC=%%a"
set "GREEN=%ESC%[0;32m"
set "YELLOW=%ESC%[1;33m"
set "CYAN=%ESC%[0;36m"
set "NC=%ESC%[0m"

echo.

:: ── 0. Kill anything already on ports 3000 / 5261 ────────────────────────────
call :free_port 3000 "Next.js"
call :free_port 5261 "Backend"

:: ── 1. Ensure NEXTAUTH_URL points to localhost ────────────────────────────────
set "ENV_FILE=%FRONTEND%\.env.local"
if exist "%ENV_FILE%" (
    :: Rewrite NEXTAUTH_URL line using PowerShell (handles any existing value)
    powershell -NoProfile -Command ^
        "(Get-Content '%ENV_FILE%') -replace 'NEXTAUTH_URL=.*','NEXTAUTH_URL=http://localhost:3000' | Set-Content '%ENV_FILE%'"
    echo %GREEN%[OK]%NC% NEXTAUTH_URL=http://localhost:3000
) else (
    echo %YELLOW%[WARN]%NC% .env.local not found at %ENV_FILE%
)

:: ── 2. Ensure Docker Desktop is running ──────────────────────────────────────
echo %CYAN%[>>]%NC% Checking Docker…
docker info >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARN]%NC% Docker daemon not responding. Please start Docker Desktop and re-run this script.
    pause
    exit /b 1
)
echo %GREEN%[OK]%NC% Docker is running

:: ── 3. Start MongoDB ──────────────────────────────────────────────────────────
echo %CYAN%[>>]%NC% Starting MongoDB…
docker compose -f "%ROOT%\docker-compose.yml" up -d --quiet-pull 2>nul
if errorlevel 1 (
    echo %YELLOW%[WARN]%NC% docker compose returned non-zero — may already be running
) else (
    echo %GREEN%[OK]%NC% MongoDB up
)
timeout /t 2 /nobreak >nul

:: ── 4. Start .NET backend in a new window ─────────────────────────────────────
echo %CYAN%[>>]%NC% Starting .NET backend…
start "Kattral-Backend" cmd /k "cd /d "%BACKEND%" && dotnet run 2>&1"
echo %GREEN%[OK]%NC% Backend window launched

:: ── 5. Install frontend dependencies if missing ──────────────────────────────
if not exist "%FRONTEND%\node_modules" (
    echo %CYAN%[>>]%NC% Installing frontend dependencies (first run — takes ~1 min)…
    pushd "%FRONTEND%"
    call npm ci
    popd
    echo %GREEN%[OK]%NC% Dependencies installed
)

:: ── 6. Start Next.js dev server in a new window ──────────────────────────────
echo %CYAN%[>>]%NC% Starting Next.js dev server…
start "Kattral-Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"
echo %GREEN%[OK]%NC% Frontend window launched

timeout /t 3 /nobreak >nul

echo.
echo %GREEN%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%NC%
echo %GREEN%  Kattral Academy is running locally!%NC%
echo %GREEN%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%NC%
echo.
echo   App:          %CYAN%http://localhost:3000%NC%
echo   Backend API:  %CYAN%http://localhost:5261%NC%
echo.
echo   Logs: check the two new terminal windows that opened.
echo.
echo   To stop: close both terminal windows, or run stop.bat
echo.
pause
exit /b 0

:: ── Helper: kill process on a given port ─────────────────────────────────────
:free_port
set "port=%~1"
set "name=%~2"
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /R ":%port% .*LISTENING"') do (
    echo %YELLOW%[WARN]%NC% %name% already on :%port% (PID %%p) — killing
    taskkill /PID %%p /F >nul 2>&1
)
exit /b 0
