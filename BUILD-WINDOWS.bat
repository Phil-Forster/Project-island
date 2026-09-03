@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SOTF Achievement Tracker - Windows Build

set "ELECTRON_LOCK=%CD%\node_modules\electron\dist\resources\default_app.asar"
set "BUILDER_CLI=%CD%\node_modules\electron-builder\out\cli\cli.js"
for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version" 2^>nul`) do set "APP_VERSION=%%V"
set "INSTALLER_NAME=SOTF-Achievement-Tracker-Setup-v%APP_VERSION%.exe"
set "RELEASE_DIR=%CD%\RELEASE"

echo.
echo ================================================
echo  SOTF Achievement Tracker - Windows x64 Build
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

rem The development app runs from node_modules\electron. npm cannot update
rem that Electron installation while the tracker itself is still open.
if exist "%ELECTRON_LOCK%" (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
    "$p=$env:ELECTRON_LOCK; try { $s=[System.IO.File]::Open($p,[System.IO.FileMode]::Open,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None); $s.Dispose(); exit 0 } catch { exit 20 }"
  if errorlevel 20 (
    echo.
    echo BUILD BLOCKED: the development Electron runtime is currently in use.
    echo.
    echo Close SOTF Achievement Tracker completely, then run BUILD-WINDOWS.bat again.
    echo Windows is currently locking:
    echo   %ELECTRON_LOCK%
    echo.
    echo This check prevents npm EBUSY errors and does not terminate other Electron apps.
    echo.
    pause
    exit /b 20
  )
)

if exist "%BUILDER_CLI%" goto build

echo Installing pinned build dependency electron-builder 26.15.7...
echo.
call npm install --save-dev electron-builder@26.15.7 --no-audit --no-fund
set "NPM_EXIT=%ERRORLEVEL%"

if not "%NPM_EXIT%"=="0" (
  echo.
  echo Dependency installation failed with exit code %NPM_EXIT%.
  echo The Windows build has not started.
  echo.
  pause
  exit /b %NPM_EXIT%
)

if not exist "%BUILDER_CLI%" (
  echo.
  echo Dependency installation completed but electron-builder was not found at:
  echo   %BUILDER_CLI%
  echo.
  echo Delete node_modules only if you want a clean dependency reinstall, then run
  echo START-WINDOWS.bat once before returning to this build script.
  echo.
  pause
  exit /b 2
)

:build
echo.
echo Building Windows x64 installer...
echo.
call node "%BUILDER_CLI%" --win nsis --x64
set "BUILD_EXIT=%ERRORLEVEL%"

if not "%BUILD_EXIT%"=="0" (
  echo.
  echo Windows build failed with exit code %BUILD_EXIT%. Review the output above.
  echo.
  pause
  exit /b %BUILD_EXIT%
)

echo.
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%" >nul 2>nul
if exist "%CD%\dist\%INSTALLER_NAME%" (
  copy /y "%CD%\dist\%INSTALLER_NAME%" "%RELEASE_DIR%\%INSTALLER_NAME%" >nul
)

echo Build complete.
echo.
if exist "%RELEASE_DIR%\%INSTALLER_NAME%" (
  echo Distribution installer:
  echo   %RELEASE_DIR%\%INSTALLER_NAME%
  echo.
  echo This single Setup EXE is the file to copy to USB or send to another PC.
  echo The unpacked developer test build remains in:
  echo   %CD%\dist\win-unpacked
  echo.
  start "" explorer.exe "%RELEASE_DIR%"
) else (
  echo The build completed, but the expected installer was not found at:
  echo   %CD%\dist\%INSTALLER_NAME%
  echo.
  echo Review the dist folder before distributing this build.
  if exist "%CD%\dist" start "" explorer.exe "%CD%\dist"
)
pause
endlocal
