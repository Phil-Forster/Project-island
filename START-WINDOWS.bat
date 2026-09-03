@echo off
setlocal
cd /d "%~dp0"

rem Normal launches hand off immediately to the silent VBS launcher.
if exist "node_modules\electron\dist\electron.exe" (
  start "" wscript.exe //B "%~dp0START-WINDOWS.vbs"
  exit /b 0
)

rem First-time setup remains visible so dependency errors are actionable.
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found in PATH.
  echo Install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo npm was not found in PATH.
  echo Repair or reinstall Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

echo Installing project dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo Dependency installation failed.
  pause
  exit /b 1
)

start "" wscript.exe //B "%~dp0START-WINDOWS.vbs"
endlocal
