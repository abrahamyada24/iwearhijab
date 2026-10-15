@echo off
setlocal
title Stop LitePOS Demo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-cloudflare-demo.ps1"
echo.
pause
