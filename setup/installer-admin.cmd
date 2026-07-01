@echo off
setlocal

echo Installing ASA-CON POS launcher...
echo.

set "APP_DIR=C:\ASA-CON\bin"
set "SCRIPT_NAME=asa-con.cmd"
set "ICON_NAME=asa-con.ico"
set "SCRIPT_PATH=%APP_DIR%\%SCRIPT_NAME%"
set "ICON_PATH=%APP_DIR%\%ICON_NAME%"
set "SHORTCUT_PATH=C:\Users\Public\Desktop\ASA-CON POS.lnk"

REM Create app folder
mkdir "%APP_DIR%" >nul 2>&1

REM Copy launcher and icon
copy /Y "%~dp0%SCRIPT_NAME%" "%SCRIPT_PATH%" >nul
if errorlevel 1 (
  echo ERROR: Cannot copy %SCRIPT_NAME%
  pause
  exit /b 1
)

copy /Y "%~dp0%ICON_NAME%" "%ICON_PATH%" >nul
if errorlevel 1 (
  echo ERROR: Cannot copy %ICON_NAME%
  pause
  exit /b 1
)

REM Set permission: normal users can run, only admin can modify
icacls "%APP_DIR%" /inheritance:r >nul
icacls "%APP_DIR%" /grant Administrators:F >nul
icacls "%APP_DIR%" /grant Users:RX >nul

REM Create desktop shortcut for all users
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');" ^
 "$s.TargetPath='%SCRIPT_PATH%';" ^
 "$s.WorkingDirectory='%APP_DIR%';" ^
 "$s.IconLocation='%ICON_PATH%';" ^
 "$s.WindowStyle=7;" ^
 "$s.Description='ASA-CON POS Kiosk';" ^
 "$s.Save()"

echo.
echo Installed successfully.
echo Shortcut created: ASA-CON POS
echo.
pause
exit /b 0