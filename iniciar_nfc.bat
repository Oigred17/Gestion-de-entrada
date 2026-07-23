@echo off
title COBAO NFC Reader
cd /d "%~dp0"
python -u nfc_reader.py --url http://localhost:8000/api/v1/nfc/scan
