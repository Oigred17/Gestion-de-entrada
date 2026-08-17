"""
Script para leer tarjetas NFC con lector ACR122U y enviarlas al backend.

El lector es una "estacion de entrada": no usa usuario/contraseña.
Solo necesita la URL del servidor y la llave de estacion (nfc_key.txt),
la misma que NFC_API_KEY en el .env del servidor.

Instalacion:
    pip install pyscard requests

Uso:
    python nfc_reader.py
    python nfc_reader.py --url http://localhost:8000/api/v1/nfc/scan
    python nfc_reader.py --url https://tunel.trycloudflare.com/api/v1/nfc/scan

Llave de estacion (prioridad):
    1. Argumento --key
    2. Variable de entorno NFC_API_KEY
    3. Archivo nfc_key.txt junto a este script o al exe
"""

import os
import sys
import time
import argparse
from pathlib import Path

try:
    from smartcard.System import readers
    from smartcard.util import toHexString
except ImportError:
    print("ERROR: Instala pyscard con: pip install pyscard")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: Instala requests con: pip install requests")
    sys.exit(1)


DEFAULT_URL = "http://localhost:8000/api/v1/nfc/scan"
POLL_INTERVAL = 0.5
RETRY_READER_INTERVAL = 5


def _search_dirs():
    dirs = []
    if getattr(sys, "frozen", False):
        dirs.append(Path(sys.executable).resolve().parent)
    dirs.append(Path(__file__).resolve().parent)
    return dirs


def load_value(cli_value: str, env_name: str, file_name: str) -> str:
    if cli_value:
        return cli_value.strip()
    env_value = os.environ.get(env_name, "").strip()
    if env_value:
        return env_value
    for search_dir in _search_dirs():
        value_file = search_dir / file_name
        if value_file.exists():
            value = value_file.read_text(encoding="utf-8").strip()
            if value:
                return value
    return ""


def get_reader():
    available = readers()
    if not available:
        return None
    return available[0]


def read_card(reader):
    try:
        connection = reader.createConnection()
        connection.connect()

        data, sw1, sw2 = connection.transmit([0xFF, 0xCA, 0x00, 0x00, 0x00])

        if sw1 == 0x90 and sw2 == 0x00:
            uid = toHexString(data).replace(" ", ":")
            connection.disconnect()
            return uid
        connection.disconnect()
        return None
    except Exception:
        return None


def send_to_backend(url: str, uid_nfc: str, api_key: str):
    try:
        headers = {}
        if api_key:
            headers["X-API-Key"] = api_key
        response = requests.post(
            url,
            json={"uid_nfc": uid_nfc},
            headers=headers,
            timeout=5,
        )
        if response.status_code == 200:
            try:
                payload = response.json()
            except Exception:
                payload = {}
            status = payload.get("status", "processed")
            if status == "ignored":
                print(f"  -> Estacion cerrada (no se registro): {payload.get('message', '')}")
            elif status in ("denied", "error"):
                print(f"  -> Rechazado: {payload.get('message', response.text)}")
            else:
                print(f"  -> Enviado al backend: {uid_nfc}")
        elif response.status_code == 401:
            print(
                "  -> Error (401): llave de estacion incorrecta o ausente. "
                "Revisa nfc_key.txt (debe coincidir con NFC_API_KEY del servidor)."
            )
        elif response.status_code == 403:
            print(f"  -> Error (403): sin permiso para registrar. {response.text}")
        else:
            print(f"  -> Error del backend ({response.status_code}): {response.text}")
    except requests.exceptions.ConnectionError:
        print(f"  -> No se pudo conectar al backend en {url}")
    except Exception as e:
        print(f"  -> Error: {e}")


def main():
    parser = argparse.ArgumentParser(description="Lector NFC ACR122U para COBAO")
    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help=f"URL del endpoint del backend (default: {DEFAULT_URL})",
    )
    parser.add_argument(
        "--key",
        default="",
        help="Llave de estacion NFC (o crea nfc_key.txt junto a este programa)",
    )
    args = parser.parse_args()

    api_key = load_value(args.key, "NFC_API_KEY", "nfc_key.txt")

    print("=" * 50)
    print("  Lector NFC ACR122U - COBAO (estacion de entrada)")
    print("=" * 50)
    print(f"Backend: {args.url}")
    if api_key:
        print(f"Llave:   configurada ({len(api_key)} caracteres)")
    else:
        print("Llave:   NO configurada (el backend rechazara las lecturas)")
        print("         -> Copia NFC_API_KEY del servidor a nfc_key.txt")
    print("Retire la tarjeta del lector antes de la siguiente lectura.")
    print()

    reader = None
    last_uid = None
    card_present = False

    try:
        while True:
            if reader is None:
                reader = get_reader()
                if reader is None:
                    print("Esperando lector NFC... (reintentando cada 5s)")
                    time.sleep(RETRY_READER_INTERVAL)
                    continue
                print(f"Lector encontrado: {reader}")
                print("Esperando tarjetas NFC...")
                print()

            uid = read_card(reader)

            if uid:
                if not card_present or uid != last_uid:
                    timestamp = time.strftime("%H:%M:%S")
                    print(f"[{timestamp}] Tarjeta detectada: {uid}")
                    send_to_backend(args.url, uid, api_key)
                    last_uid = uid
                card_present = True
            else:
                if card_present:
                    card_present = False
                    last_uid = None

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\nLector detenido.")
        sys.exit(0)


if __name__ == "__main__":
    main()
