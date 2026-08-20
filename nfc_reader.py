#!/usr/bin/env python3
"""
COBAO NFC Reader — Lector de tarjetas NFC MIFARE Classic.

Funciona en Linux y Windows. Lee UIDs de tarjetas NFC mediante
el subsistema PC/SC (pcsclite) y los envía al backend por HTTP.

Archivos de configuración (en la misma carpeta del script o del .exe):
  nfc_url.txt   — URL del endpoint .../api/v1/nfc/scan
  nfc_key.txt   — Misma llave que NFC_API_KEY del servidor

Uso:
  python nfc_reader.py [--url URL]

Si no se pasa --url, se lee de nfc_url.txt. Si no existe, se usa
http://localhost:8000/api/v1/nfc/scan por defecto.
"""

import argparse
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_URL = "http://localhost:8000/api/v1/nfc/scan"

log = logging.getLogger("nfc_reader")


def _read_file_trimmed(path: Path) -> str:
    """Lee un archivo de texto y devuelve su contenido sin espacios."""
    try:
        return path.read_text(encoding="utf-8").strip()
    except (OSError, UnicodeDecodeError):
        return ""


def load_config(cli_url: str | None = None) -> tuple[str, str]:
    """Retorna (url, api_key) desde archivos o argumentos CLI."""
    url = cli_url or _read_file_trimmed(SCRIPT_DIR / "nfc_url.txt") or DEFAULT_URL
    key = _read_file_trimmed(SCRIPT_DIR / "nfc_key.txt")
    return url, key


# ---------------------------------------------------------------------------
# Envío HTTP
# ---------------------------------------------------------------------------

def send_uid(url: str, api_key: str, uid: str) -> dict | None:
    """Envía el UID leído al backend y retorna la respuesta JSON."""
    payload = json.dumps({"uid_nfc": uid, "tipo": "auto"}).encode()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if api_key:
        headers["X-API-Key"] = api_key

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        log.warning("HTTP %d al enviar UID %s: %s", exc.code, uid, exc.read().decode(errors="replace")[:200])
        return None
    except Exception as exc:
        log.warning("Error de red: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Lector PC/SC (pyscard)
# ---------------------------------------------------------------------------

def _pcscreader():
    """Intenta importar pyscard y retorna el módulo, o None."""
    try:
        from smartcard.System import readers
        from smartcard.util import toHexString
        return readers, toHexString
    except ImportError:
        return None, None


def _detectar_lector(readers_fn):
    """Busca un lector conectado cuyo nombre contenga 'ACS' o el primero disponible."""
    try:
        available = readers_fn()
    except Exception as exc:
        log.error("No se pudieron listar lectores PC/SC: %s", exc)
        log.error("¿Está instalado pcscd? (sudo apt install pcscd)")
        return None

    if not available:
        log.error("No se encontró ningún lector NFC conectado.")
        return None

    # Priorizar lector ACS (ACR122U)
    for r in available:
        if "ACS" in str(r).upper() or "ACR" in str(r).upper():
            log.info("Lector detectado: %s", r)
            return r

    log.info("Lector detectado: %s (no ACS, usando el primero)", available[0])
    return available[0]


def _hex_uid(bytes_uid: list[int]) -> str:
    """Convierte una lista de bytes a string hex (ej. 'A1B2C3D4')."""
    return "".join(f"{b:02X}" for b in bytes_uid)


def read_cards_loop(url: str, api_key: str):
    """Bucle principal: lee tarjetas NFC y envía UIDs al backend."""
    readers_fn, _ = _pcscreader()
    if readers_fn is None:
        log.error(
            "No se pudo importar 'smartcard' (pyscard).\n"
            "Instala con: pip install pyscard\n"
            "En Linux también necesitas: sudo apt install pcscd python3-pyscard"
        )
        sys.exit(1)

    lector = _detectar_lector(readers_fn)
    if lector is None:
        sys.exit(1)

    log.info("Conectado a: %s", lector)
    log.info("Backend: %s", url)
    log.info("Esperando tarjetas NFC... (Ctrl+C para salir)\n")

    last_uid = ""
    last_time = 0.0
    DEBOUNCE_SECONDS = 2.0  # Ignorar la misma tarjeta durante 2 s

    try:
        while True:
            try:
                connection = lector.createConnection()
                connection.connect()

                # Obtener UID — MIFARE Classic usa GET DATA con Lc=0x02 0x60 0x00
                # También funciona con la lista de bytes del ATR o APDU simple
                try:
                    # Método 1: APDU para obtener UID (funciona con ACR122U)
                    data, sw1, sw2 = connection.transmit([0xFF, 0xCA, 0x00, 0x00, 0x00])
                    if sw1 == 0x90 and sw2 == 0x00 and data:
                        uid = _hex_uid(data)
                    else:
                        continue
                except Exception:
                    continue

                now = time.time()
                if uid == last_uid and (now - last_time) < DEBOUNCE_SECONDS:
                    continue

                last_uid = uid
                last_time = now

                log.info("Tarjeta detectada: %s", uid)
                result = send_uid(url, api_key, uid)
                if result:
                    status = result.get("status", "?")
                    msg = result.get("message", result.get("tipo_evento", ""))
                    if status in ("processed", "success", "captured"):
                        log.info("  -> %s %s", status.upper(), msg)
                    else:
                        log.warning("  -> %s: %s", status, msg)
                else:
                    log.warning("  -> Sin respuesta del servidor")

            except KeyboardInterrupt:
                raise
            except Exception:
                # No hay tarjeta presente — esperar y reintentar
                time.sleep(0.3)

    except KeyboardInterrupt:
        log.info("\nLector detenido.")


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="COBAO NFC Reader — Lector de tarjetas NFC para el sistema de control de acceso"
    )
    parser.add_argument("--url", help="URL del endpoint /api/v1/nfc/scan")
    parser.add_argument("--debug", action="store_true", help="Modo debug con más detalle")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    url, api_key = load_config(args.url)

    print()
    print("  COBAO NFC Reader — Lector de tarjetas")
    print(f"  Backend: {url}")
    print(f"  Llave:   {'configurada' if api_key else 'NO CONFIGURADA (nfc_key.txt faltante)'}")
    print()

    if not api_key:
        log.warning("No se encontró nfc_key.txt o está vacío.")
        log.warning("Copia NFC_API_KEY del servidor a nfc_key.txt")
        print()

    read_cards_loop(url, api_key)


if __name__ == "__main__":
    main()
