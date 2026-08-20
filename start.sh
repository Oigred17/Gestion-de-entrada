#!/bin/bash

echo "=== Iniciando COBAO NFC ==="

# Intentar iniciar lector NFC (funciona en Linux con USB passthrough,
# falla silenciosamente en Windows donde se usa nfc_reader.exe externo)
echo "Iniciando lector NFC..."
if [ -f nfc_reader.py ]; then
  python -u nfc_reader.py --url http://localhost:8000/api/v1/nfc/scan &
  NFC_PID=$!
  sleep 2

  if kill -0 $NFC_PID 2>/dev/null; then
    echo "Lector NFC interno iniciado correctamente"
  else
    echo "Lector NFC interno no disponible (se requiere lector externo en Windows)"
  fi
else
  echo "nfc_reader.py no encontrado (se usa lector externo)"
fi

# Iniciar FastAPI
# --forwarded-allow-ips=* : confiar en X-Forwarded-Proto del tunel/proxy
# (sin esto, redirects de trailing-slash salen como http:// y el navegador
#  bloquea Mixed Content cuando la pagina se sirve por HTTPS).
echo "Iniciando FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'