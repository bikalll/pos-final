@echo off
title Expo Tunnel (Auto-Restart)
setlocal enabledelayedexpansion

echo Starting Expo in Tunnel Mode with auto-restart...
echo.
echo Tips:
echo  - Leave this window open; it will auto-restart if the tunnel closes.
echo  - Press Ctrl+C and then Y to stop.
echo  - Allow any Windows Firewall prompts for Node.js.
echo.

set EXPO_PUBLIC_ENABLE_BLUETOOTH=true
set EXPO_PUBLIC_ENV=development

set FIRST_RUN=1

:loop
if !FIRST_RUN! EQU 1 (
  echo First run: clearing Metro cache...
  npx expo start --tunnel --clear
  set FIRST_RUN=0
) else (
  echo Restarting Expo tunnel without cache clear...
  npx expo start --tunnel
)

echo.
echo Tunnel closed or Expo exited. Restarting in 5 seconds... (Ctrl+C to stop)
timeout /t 5 /nobreak >nul
goto loop














