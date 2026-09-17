@echo off
setlocal
cd /d "%~dp0"

set "ELECTRON_CLI=%CD%\node_modules\electron\cli.js"
set "ELECTRON_EXE=%CD%\node_modules\electron\dist\electron.exe"

rem Electron 43+ installs the npm package first and downloads the runtime on
rem first CLI use. Check for the package/CLI, not the runtime executable.
if exist "%ELECTRON_CLI%" goto prepare_runtime

rem First-time dependency setup remains visible so errors are actionable.
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
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Dependency installation failed.
  pause
  exit /b 1
)

if not exist "%ELECTRON_CLI%" (
  echo.
  echo Dependency installation completed, but the Electron package is missing.
  echo Expected: %ELECTRON_CLI%
  echo.
  pause
  exit /b 2
)

:prepare_runtime
rem A clean Electron 43+ install may not contain electron.exe yet. Running the
rem package CLI once downloads/prepares the pinned runtime before silent launch.
if not exist "%ELECTRON_EXE%" (
  echo Preparing Electron runtime for first launch...
  echo.
  call node "%ELECTRON_CLI%" --version
  if errorlevel 1 (
    echo.
    echo Electron runtime preparation failed. Review the output above.
    echo.
    pause
    exit /b 3
  )
)

start "" wscript.exe //B "%~dp0START-WINDOWS.vbs"
endlocal
