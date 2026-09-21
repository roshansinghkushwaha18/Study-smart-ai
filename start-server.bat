@echo off
setlocal
title StudySmart AI - Local Server
cd /d "%~dp0"
echo ===================================================
echo       StudySmart AI - BBA Digital Marketing & AI
echo ===================================================
echo.
echo Starting StudySmart AI Node.js Express server...
echo.

if not exist node_modules (
    echo [INFO] First time setup detected. Installing dependencies...
    call npm.cmd install
    echo.
)

echo [INFO] Opening the StudySmart app at http://127.0.0.1:5000 ...
start "" "http://127.0.0.1:5000"
echo [INFO] Running server on the PORT configured in .env ...
npm.cmd start
