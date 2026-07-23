"""
Script para leer tarjetas NFC con lector ACR122U y enviarlas al backend.

Funciona en Windows y Linux.
En Windows: se ejecuta externamente (auto-inicio con VBS).
En Linux: se ejecuta dentro del contenedor Docker.

Instalacion:
    pip install pyscard requests

Uso:
    python nfc_reader.py
    python nfc_reader.py --url http://localhost:8000/api/v1/nfc/scan
"""

import sys
import time
import argparse

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
            uid = toHexString(data).replace(' ', ':')
            connection.disconnect()
            return uid
        else:
            connection.disconnect()
            return None
    except Exception:
        return None


def send_to_backend(url, uid_nfc):
    try:
        response = requests.post(
            url,
            json={"uid_nfc": uid_nfc},
            timeout=5,
        )
        if response.status_code == 200:
            print(f"  -> Enviado al backend: {uid_nfc}")
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
    args = parser.parse_args()

    print("=" * 50)
    print("  Lector NFC ACR122U - COBAO")
    print("=" * 50)
    print(f"Backend: {args.url}")
    print()

    reader = None
    last_uid = None
    last_time = 0

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

            if uid and (uid != last_uid or time.time() - last_time > 2):
                timestamp = time.strftime("%H:%M:%S")
                print(f"[{timestamp}] Tarjeta detectada: {uid}")
                send_to_backend(args.url, uid)
                last_uid = uid
                last_time = time.time()
            elif not uid:
                last_uid = None

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\nLector detenido.")
        sys.exit(0)


if __name__ == "__main__":
    main()
