@echo off
:: stop.bat — Tear down all Kattral Academy local services

setlocal EnableDelayedExpansion
for /f %%a in ('echo prompt $E^| cmd /Q') do set "ESC=%%a"
set "GREEN=%ESC%[0;32m"
set "CYAN=%ESC%[0;36m"
set "NC=%ESC%[0m"

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo %CYAN%[>>]%NC% Killing processes on ports 3000 and 5261…
for %%p in (3000 5261) do (
    for /f "tokens=5" %%x in ('netstat -ano 2^>nul ^| findstr /R ":%%p .*LISTENING"') do (
        taskkill /PID %%x /F >nul 2>&1
    )
)
echo %GREEN%[OK]%NC% Ports freed

echo %CYAN%[>>]%NC% Stopping MongoDB…
docker compose -f "%ROOT%\docker-compose.yml" down 2>nul
echo %GREEN%[OK]%NC% MongoDB stopped

echo.
echo %GREEN%All services stopped.%NC%
echo.
pause
