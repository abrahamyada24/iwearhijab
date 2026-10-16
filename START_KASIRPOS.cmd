@echo off
setlocal
title KasirPOS Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-cloudflare-demo.ps1"
echo.
pause
