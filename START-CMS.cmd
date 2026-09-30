@echo off
rem Double-click this file to start the portfolio CMS.
rem Keep this window open while you are editing - closing it stops the website.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found on this computer.
  echo   Install it from https://nodejs.org  ^(version 22 or newer^), then run this again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting the portfolio CMS...
echo   Website : http://localhost:4173/
echo   Admin   : http://localhost:4173/admin
echo.
echo   Keep this window open. Press Ctrl+C to stop.
echo.

node cms\server.js
pause
