@echo off
setlocal
title Stop KasirPOS
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-cloudflare-demo.ps1"
echo.
pause
