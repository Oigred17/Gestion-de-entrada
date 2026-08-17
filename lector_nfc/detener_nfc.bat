@echo off
title Detener lector NFC COBAO
taskkill /IM nfc_reader.exe /F >nul 2>&1
if errorlevel 1 (
    echo No habia nfc_reader.exe en ejecucion.
) else (
    echo Lector NFC detenido.
)
echo.
pause
