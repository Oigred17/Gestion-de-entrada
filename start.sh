#!/bin/bash

echo "=== Iniciando COBAO NFC ==="

# Intentar iniciar lector NFC (funciona en Linux con USB passthrough,
# falla silenciosamente en Windows donde se usa nfc_reader.py externo)
echo "Iniciando lector NFC..."
python -u nfc_reader.py --url http://localhost:8000/api/v1/nfc/scan &
NFC_PID=$!
sleep 2

if kill -0 $NFC_PID 2>/dev/null; then
    echo "Lector NFC interno iniciado correctamente"
else
    echo "Lector NFC interno no disponible (se requiere lector externo en Windows)"
fi

# Iniciar FastAPI
echo "Iniciando FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000