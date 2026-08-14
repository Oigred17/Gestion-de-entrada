@echo off
title COBAO NFC Reader
cd /d "%~dp0"

rem ============================================================
rem URL del backend donde se envian los UIDs leidos.
rem Prioridad: 1) argumento  2) nfc_url.txt  3) localhost
rem
rem Ejemplos:
rem   iniciar_nfc.bat
rem   iniciar_nfc.bat http://192.168.1.50:8000/api/v1/nfc/scan
rem   iniciar_nfc.bat https://algo.trycloudflare.com/api/v1/nfc/scan
rem
rem O crea nfc_url.txt en esta carpeta con una sola linea:
rem   http://192.168.1.50:8000/api/v1/nfc/scan
rem ============================================================

set "NFC_URL="

if not "%~1"=="" (
    set "NFC_URL=%~1"
) else if exist "%~dp0nfc_url.txt" (
    set /p NFC_URL=<"%~dp0nfc_url.txt"
)

if "%NFC_URL%"=="" set "NFC_URL=http://localhost:8000/api/v1/nfc/scan"

rem Quitar espacios al inicio/final
for /f "tokens=* delims= " %%a in ("%NFC_URL%") do set "NFC_URL=%%a"

echo.
echo  COBAO NFC Reader
echo  Backend: %NFC_URL%
echo  (Para cambiar la URL: edita nfc_url.txt o pasa la URL como argumento)
echo.

if exist "%~dp0nfc_reader.exe" (
    "%~dp0nfc_reader.exe" --url "%NFC_URL%"
) else (
    python -u nfc_reader.py --url "%NFC_URL%"
)

echo.
pause
