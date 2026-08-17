@echo off
title COBAO NFC - Quitar inicio automatico
cd /d "%~dp0"

set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\COBAO_NFC_Lector.lnk"

if exist "%LNK%" (
    del "%LNK%"
    echo OK: se quito el inicio automatico del lector NFC.
) else (
    echo No habia acceso directo de inicio automatico.
)
echo.
pause
