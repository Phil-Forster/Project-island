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
echo.
call npm install
if errorlevel 1 (
  echo.
  echo Dependency installation failed.
  pause
  exit /b 1
)

rem Never hand back to the VBS launcher unless Electron now exists. This
rem prevents BAT -> VBS -> BAT recursion when dependency setup is incomplete.
if not exist "node_modules\electron\dist\electron.exe" (
  echo.
  echo Dependency installation completed, but Electron was not installed correctly.
  echo Expected: %CD%\node_modules\electron\dist\electron.exe
  echo.
  echo Run npm.cmd install in this folder and review any reported error.
  echo.
  pause
  exit /b 2
)

start "" wscript.exe //B "%~dp0START-WINDOWS.vbs"
endlocal
