@echo off
rem ============================================================
rem  Empaqueta nfc_reader.py en nfc_reader.exe (sin Python)
rem  Requisito: python con PyInstaller instalado
rem    pip install pyinstaller
rem ============================================================
setlocal
title COBAO NFC - Build exe
cd /d "%~dp0"

echo Verificando PyInstaller...
python -m PyInstaller --version >nul 2>&1
if errorlevel 1 (
    echo Instalando PyInstaller...
    python -m pip install pyinstaller
)

echo Empaquetando nfc_reader.py...
python -m PyInstaller --onefile --name nfc_reader --distpath . ^
    --workpath "build" --specpath "build" ^
    --hidden-import smartcard ^
    --hidden-import smartcard.System ^
    --hidden-import smartcard.util ^
    nfc_reader.py

if exist nfc_reader.exe (
    echo.
    echo OK: nfc_reader.exe generado en "%~dp0nfc_reader.exe"
) else (
    echo.
    echo ERROR: no se genero el exe
    exit /b 1
)
endlocal
