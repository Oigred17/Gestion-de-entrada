@echo off
title COBAO NFC Reader
cd /d "%~dp0"

rem Si existe el exe compilado, usarlo (no requiere Python)
if exist "%~dp0nfc_reader.exe" (
    "%~dp0nfc_reader.exe" --url http://localhost:8000/api/v1/nfc/scan
) else (
    python -u nfc_reader.py --url http://localhost:8000/api/v1/nfc/scan
)
