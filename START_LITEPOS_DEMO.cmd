@echo off
setlocal
title LitePOS Demo Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-cloudflare-demo.ps1"
echo.
pause
