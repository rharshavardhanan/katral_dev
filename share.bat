@echo off
:: share.bat — Start everything and expose the app via ngrok for external testers
:: Usage: share.bat
:: Stop:  Close terminal windows, then run stop.bat

setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "FRONTEND=%ROOT%\frontend\edu-web"
set "BACKEND=%ROOT%\backend\EduPlatform.Api"
set "ENV_FILE=%FRONTEND%\.env.local"

for /f %%a in ('echo prompt $E^| cmd /Q') do set "ESC=%%a"
set "GREEN=%ESC%[0;32m"
set "YELLOW=%ESC%[1;33m"
set "CYAN=%ESC%[0;36m"
set "NC=%ESC%[0m"

echo.

:: ── 0. Kill anything on ports 3000 / 5261 / 4040 ────────────────────────────
call :free_port 3000 "Next.js"
call :free_port 5261 "Backend"
call :free_port 4040 "ngrok dashboard"

:: Kill any stale ngrok process
taskkill /IM ngrok.exe /F >nul 2>&1 && (
    echo %YELLOW%[WARN]%NC% Killed stale ngrok
    timeout /t 1 /nobreak >nul
)

:: ── 1. Ensure Docker Desktop is running ──────────────────────────────────────
echo %CYAN%[>>]%NC% Checking Docker…
docker info >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARN]%NC% Docker daemon not responding. Please start Docker Desktop and re-run.
    pause
    exit /b 1
)
echo %GREEN%[OK]%NC% Docker is running

:: ── 2. Start MongoDB ──────────────────────────────────────────────────────────
echo %CYAN%[>>]%NC% Starting MongoDB…
docker compose -f "%ROOT%\docker-compose.yml" up -d --quiet-pull 2>nul
if errorlevel 1 (
    echo %YELLOW%[WARN]%NC% docker compose returned non-zero — may already be running
) else (
    echo %GREEN%[OK]%NC% MongoDB up
)
timeout /t 2 /nobreak >nul

:: ── 3. Start ngrok tunnel for frontend ───────────────────────────────────────
echo %CYAN%[>>]%NC% Starting ngrok tunnel for frontend (port 3000)…

:: Merge project ngrok.yml with global ngrok config
set "NGROK_GLOBAL_CFG=%USERPROFILE%\AppData\Local\ngrok\ngrok.yml"
if not exist "%NGROK_GLOBAL_CFG%" set "NGROK_GLOBAL_CFG=%USERPROFILE%\.ngrok2\ngrok.yml"

start "Kattral-ngrok" /B ngrok start frontend --config "%ROOT%\ngrok.yml" --config "%NGROK_GLOBAL_CFG%" > "%TEMP%\ngrok-share.log" 2>&1

:: Poll ngrok API for up to 15 seconds
set "FRONTEND_URL="
set /a attempts=0
:wait_ngrok
set /a attempts+=1
if %attempts% gtr 15 (
    echo %YELLOW%[WARN]%NC% ngrok failed to start in time. Check %TEMP%\ngrok-share.log
    goto :ngrok_failed
)
timeout /t 1 /nobreak >nul
curl -s http://localhost:4040/api/tunnels >"%TEMP%\ngrok-tunnels.json" 2>nul
findstr /C:"public_url" "%TEMP%\ngrok-tunnels.json" >nul 2>&1 || goto :wait_ngrok

:: Extract the https public_url using PowerShell
for /f "delims=" %%u in ('powershell -NoProfile -Command ^
    "$t = Get-Content '%TEMP%\ngrok-tunnels.json' | ConvertFrom-Json;" ^
    "$url = ($t.tunnels | Where-Object { $_.config.addr -like '*3000*' } | Select-Object -First 1).public_url;" ^
    "if ($url) { $url } else { '' }"') do set "FRONTEND_URL=%%u"

:ngrok_failed
if "%FRONTEND_URL%"=="" (
    echo %YELLOW%[WARN]%NC% Could not get frontend ngrok URL. Check http://localhost:4040
    set "FRONTEND_URL=http://localhost:3000"
) else (
    echo %GREEN%[OK]%NC% Frontend tunnel: %FRONTEND_URL%
)

:: ── 4. Update NEXTAUTH_URL to the ngrok URL ───────────────────────────────────
if exist "%ENV_FILE%" (
    powershell -NoProfile -Command ^
        "(Get-Content '%ENV_FILE%') -replace 'NEXTAUTH_URL=.*','NEXTAUTH_URL=%FRONTEND_URL%' | Set-Content '%ENV_FILE%'"
    echo %GREEN%[OK]%NC% Set NEXTAUTH_URL=%FRONTEND_URL%
) else (
    echo %YELLOW%[WARN]%NC% .env.local not found — skipping NEXTAUTH_URL update
)

:: ── 5. Start .NET backend in a new window ─────────────────────────────────────
echo %CYAN%[>>]%NC% Starting .NET backend…
start "Kattral-Backend" cmd /k "cd /d "%BACKEND%" && dotnet run"
echo %GREEN%[OK]%NC% Backend window launched

:: ── 6. Install frontend dependencies if missing ───────────────────────────────
if not exist "%FRONTEND%\node_modules" (
    echo %CYAN%[>>]%NC% Installing frontend dependencies (first run — takes ~1 min)…
    pushd "%FRONTEND%"
    call npm ci
    popd
    echo %GREEN%[OK]%NC% Dependencies installed
)

:: ── 7. Build Next.js for production, fall back to dev on failure ──────────────
echo %CYAN%[>>]%NC% Building Next.js for production…
pushd "%FRONTEND%"
call npm run build >"%TEMP%\frontend-build.log" 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARN]%NC% Build failed — check %TEMP%\frontend-build.log — falling back to dev server
    start "Kattral-Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"
) else (
    echo %GREEN%[OK]%NC% Production build complete
    echo %CYAN%[>>]%NC% Starting Next.js production server…
    start "Kattral-Frontend" cmd /k "cd /d "%FRONTEND%" && npm run start"
)
popd

:: ── 8. Wait for frontend to respond (up to 60s) ───────────────────────────────
echo %CYAN%[>>]%NC% Waiting for frontend to come up…
set /a fw=0
:wait_frontend
set /a fw+=1
if %fw% gtr 60 (
    echo %YELLOW%[WARN]%NC% Frontend didn't respond in 60s — check the Kattral-Frontend window
    goto :print_info
)
timeout /t 1 /nobreak >nul
curl -s http://localhost:3000 -o nul 2>nul
if errorlevel 1 goto :wait_frontend
echo %GREEN%[OK]%NC% Frontend is up

:print_info
echo.
echo %GREEN%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%NC%
echo %GREEN%  Kattral Academy is now shareable!%NC%
echo %GREEN%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%NC%
echo.
echo   Share this URL with testers:
echo   %CYAN%%FRONTEND_URL%%NC%
echo.
echo   ngrok dashboard:  %CYAN%http://localhost:4040%NC%
echo.
echo   %YELLOW%One-time Google OAuth setup (only needed for new ngrok domains):%NC%
echo   1. Go to https://console.cloud.google.com/apis/credentials
echo   2. Edit your OAuth client
echo   3. Add to Authorised JavaScript origins:  %FRONTEND_URL%
echo   4. Add to Authorised redirect URIs:       %FRONTEND_URL%/api/auth/callback/google
echo.
echo   Logs:
echo     Backend:   %TEMP%\backend-share.log  (in the Backend window)
echo     Frontend:  %TEMP%\frontend-build.log (build), Frontend window (runtime)
echo     ngrok:     %TEMP%\ngrok-share.log
echo.
echo   To stop: close all three windows, then run stop.bat
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
