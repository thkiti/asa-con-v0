@echo off
setlocal

set "POS_URL=https://asa-con-v0.vercel.app"
set "PROFILE_BASE=C:\ASA-CON"

echo Starting ASA-CON POS Kiosk...
echo URL: %POS_URL%
echo.

REM ---- Microsoft Edge ----
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  set "BROWSER_NAME=Microsoft Edge"
  set "PROFILE_DIR=%PROFILE_BASE%\EdgePOS"
  goto START_EDGE
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  set "BROWSER_NAME=Microsoft Edge"
  set "PROFILE_DIR=%PROFILE_BASE%\EdgePOS"
  goto START_EDGE
)

REM ---- Google Chrome ----
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  set "BROWSER_NAME=Google Chrome"
  set "PROFILE_DIR=%PROFILE_BASE%\ChromePOS"
  goto START_CHROME
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  set "BROWSER_NAME=Google Chrome"
  set "PROFILE_DIR=%PROFILE_BASE%\ChromePOS"
  goto START_CHROME
)

echo No supported browser found.
echo Please install Microsoft Edge or Google Chrome.
pause
exit /b 1

:START_EDGE
echo Found %BROWSER_NAME%

taskkill /IM msedge.exe /F >nul 2>&1

start "" "%BROWSER%" ^
  --kiosk "%POS_URL%" ^
  --edge-kiosk-type=fullscreen ^
  --no-first-run ^
  --disable-features=Translate ^
  --user-data-dir="%PROFILE_DIR%"

exit /b 0

:START_CHROME
echo Found %BROWSER_NAME%

taskkill /IM chrome.exe /F >nul 2>&1

start "" "%BROWSER%" ^
  --kiosk "%POS_URL%" ^
  --no-first-run ^
  --disable-features=Translate ^
  --user-data-dir="%PROFILE_DIR%"

exit /b 0