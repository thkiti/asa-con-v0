@echo off
setlocal

echo Installing ASA-CON POS launcher...
echo.

set "APP_DIR=%LOCALAPPDATA%\ASA-CON\bin"
set "SCRIPT_NAME=asa-con.cmd"
set "ICON_NAME=asa-con.ico"
set "SOURCE_DIR=%~dp0"
set "SCRIPT_SOURCE=%SOURCE_DIR%%SCRIPT_NAME%"
set "ICON_SOURCE=%SOURCE_DIR%%ICON_NAME%"
set "SCRIPT_PATH=%APP_DIR%\%SCRIPT_NAME%"
set "ICON_PATH=%APP_DIR%\%ICON_NAME%"

echo Source folder:
echo %SOURCE_DIR%
echo.

if not exist "%SCRIPT_SOURCE%" (
  echo ERROR: Missing source file:
  echo %SCRIPT_SOURCE%
  pause
  exit /b 1
)

if not exist "%ICON_SOURCE%" (
  echo ERROR: Missing source file:
  echo %ICON_SOURCE%
  pause
  exit /b 1
)

mkdir "%APP_DIR%" >nul 2>&1

copy /Y "%SCRIPT_SOURCE%" "%SCRIPT_PATH%"
if errorlevel 1 (
  echo ERROR: Cannot copy asa-con.cmd
  pause
  exit /b 1
)

copy /Y "%ICON_SOURCE%" "%ICON_PATH%"
if errorlevel 1 (
  echo ERROR: Cannot copy asa-con.ico
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$desktop=[Environment]::GetFolderPath('Desktop');" ^
 "$shortcut=Join-Path $desktop 'asa-con.lnk';" ^
 "$s=(New-Object -COM WScript.Shell).CreateShortcut($shortcut);" ^
 "$s.TargetPath='%SCRIPT_PATH%';" ^
 "$s.WorkingDirectory='%APP_DIR%';" ^
 "$s.IconLocation='%ICON_PATH%';" ^
 "$s.WindowStyle=7;" ^
 "$s.Description='ASA-CON POS Kiosk';" ^
 "$s.Save();"

if errorlevel 1 (
  echo ERROR: Cannot create desktop shortcut.
  pause
  exit /b 1
)

echo.
echo Installed successfully.
echo Shortcut created on Desktop: ASA-CON POS
pause
exit /b 0