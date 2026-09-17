@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SOTF Achievement Tracker - Bespoke Windows Build

set "ELECTRON_LOCK=%CD%\node_modules\electron\dist\resources\default_app.asar"
set "BUILDER_CLI=%CD%\node_modules\electron-builder\out\cli\cli.js"

echo.
echo ================================================
echo  Project Island - Bespoke Windows x64 Build
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  echo Install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found in PATH.
  echo Repair or reinstall Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

if exist "%ELECTRON_LOCK%" (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
    "$p=$env:ELECTRON_LOCK; try { $s=[System.IO.File]::Open($p,[System.IO.FileMode]::Open,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None); $s.Dispose(); exit 0 } catch { exit 20 }"
  if errorlevel 20 (
    echo.
    echo BUILD BLOCKED: the development Electron runtime is currently in use.
    echo Close SOTF Achievement Tracker completely, then run BUILD-WINDOWS.bat again.
    echo.
    pause
    exit /b 20
  )
)

if exist "%BUILDER_CLI%" goto build

echo Installing pinned build dependencies...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Dependency installation failed.
  echo.
  pause
  exit /b 1
)

:build
echo Running bespoke deployment build...
echo.
call node "%CD%\tools\build-deployment.js"
set "BUILD_EXIT=%ERRORLEVEL%"
if not "%BUILD_EXIT%"=="0" (
  echo.
  echo Windows build failed with exit code %BUILD_EXIT%. Review the output above.
  echo.
  pause
  exit /b %BUILD_EXIT%
)

echo.
echo Build complete. The distributable Setup EXE is in:
echo   %CD%\RELEASE
echo.
start "" explorer.exe "%CD%\RELEASE"
pause
endlocal
