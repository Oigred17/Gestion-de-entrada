#!/bin/bash
# ============================================================
# COBAO NFC Reader — Lanzador Linux (carpeta lector_nfc)
#
# Requisitos:
#   sudo apt install pcscd python3-pyscard
#   pip install pyscard
# ============================================================

set -e
cd "$(dirname "$0")"

# --- Leer URL ---
NFC_URL=""

if [ -n "$1" ]; then
    NFC_URL="$1"
elif [ -f nfc_url.txt ]; then
    NFC_URL="$(cat nfc_url.txt | tr -d '[:space:]')"
fi

if [ -z "$NFC_URL" ]; then
    NFC_URL="http://localhost:8000/api/v1/nfc/scan"
fi

echo
echo "  COBAO NFC Reader — Estacion de entrada"
echo "  Backend: $NFC_URL"
if [ -f nfc_key.txt ]; then
    echo "  Llave:   nfc_key.txt"
else
    echo "  AVISO: falta nfc_key.txt — copia NFC_API_KEY del servidor"
fi
echo

# --- Verificar pcscd ---
if ! systemctl is-active --quiet pcscd 2>/dev/null; then
    echo "  Iniciando servicio pcscd..."
    sudo systemctl start pcscd 2>/dev/null || true
fi

# --- Ejecutar lector ---
if [ -f nfc_reader.py ]; then
    python3 -u nfc_reader.py --url "$NFC_URL"
elif [ -f ../nfc_reader.py ]; then
    python3 -u ../nfc_reader.py --url "$NFC_URL"
else
    echo "  ERROR: nfc_reader.py no encontrado"
    exit 1
fi
