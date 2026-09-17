@echo off
setlocal
cd /d "%~dp0"

set "ELECTRON_CLI=%CD%\node_modules\electron\cli.js"
set "ELECTRON_EXE=%CD%\node_modules\electron\dist\electron.exe"

rem Fast path: a prepared runtime should launch immediately through the silent VBS wrapper.
if exist "%ELECTRON_EXE%" goto launch

rem If dependencies are not installed yet, install them once with visible errors.
if not exist "%ELECTRON_CLI%" (
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
)

if not exist "%ELECTRON_CLI%" (
  echo.
  echo Dependency setup completed, but the Electron package is missing.
  echo Expected: %ELECTRON_CLI%
  echo.
  pause
  exit /b 2
)

rem Electron 43+ can defer downloading its runtime until first CLI use.
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

if not exist "%ELECTRON_EXE%" (
  echo.
  echo Electron reported successful preparation, but its runtime executable is missing.
  echo Expected: %ELECTRON_EXE%
  echo.
  pause
  exit /b 4
)

:launch
start "" wscript.exe //B "%~dp0START-WINDOWS.vbs"
endlocal
