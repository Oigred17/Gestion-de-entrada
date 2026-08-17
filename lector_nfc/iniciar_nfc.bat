@echo off
title COBAO NFC Reader
cd /d "%~dp0"

rem ============================================================
rem Estacion de entrada (lector fisico).
rem En esta carpeta solo necesitas:
rem   - nfc_reader.exe
rem   - nfc_url.txt   (URL del backend .../api/v1/nfc/scan)
rem   - nfc_key.txt   (misma llave que NFC_API_KEY del servidor)
rem
rem NO uses usuario ni contraseña aqui.
rem ============================================================

set "NFC_URL="

if not "%~1"=="" (
    set "NFC_URL=%~1"
) else if exist "%~dp0nfc_url.txt" (
    set /p NFC_URL=<"%~dp0nfc_url.txt"
)

if "%NFC_URL%"=="" set "NFC_URL=http://localhost:8000/api/v1/nfc/scan"

for /f "tokens=* delims= " %%a in ("%NFC_URL%") do set "NFC_URL=%%a"

echo.
echo  COBAO NFC Reader - Estacion de entrada
echo  Backend: %NFC_URL%
if exist "%~dp0nfc_key.txt" (
    echo  Llave:   nfc_key.txt
) else (
    echo  AVISO: falta nfc_key.txt — copia NFC_API_KEY del servidor
)
echo.

if exist "%~dp0nfc_reader.exe" (
    "%~dp0nfc_reader.exe" --url "%NFC_URL%"
) else (
    python -u "%~dp0..\nfc_reader.py" --url "%NFC_URL%"
)

echo.
pause
