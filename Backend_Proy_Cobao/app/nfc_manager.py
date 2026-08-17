import asyncio
import json
import logging
import time
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Sin heartbeat de Escaneo/Kiosco, la estación se cierra sola.
ESTACION_TIMEOUT_SECONDS = 90


class NFCConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()
        self.capture_mode = False
        self.capture_event = asyncio.Event()
        self.captured_uid: str | None = None
        self.last_seen_uid: str | None = None
        self.last_seen_at: float = 0.0

        # Estación de registro: solo con personal Entrada/Prefectura en pantalla.
        self.estacion_abierta = False
        self.estacion_usuario: str | None = None
        self.estacion_heartbeat_at: float = 0.0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(f"WebSocket NFC conectado. Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"WebSocket NFC desconectado. Total: {len(self.active_connections)}")

    async def broadcast(self, data: dict[str, Any]):
        message = json.dumps(data, default=str)
        disconnected = []
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                self.active_connections.remove(conn)

    def note_uid(self, uid_nfc: str) -> None:
        self.last_seen_uid = uid_nfc
        self.last_seen_at = time.time()

    def start_capture(self):
        self.capture_mode = True
        self.capture_event.clear()
        self.captured_uid = None
        logger.info("Modo captura NFC activado")

    def stop_capture(self):
        self.capture_mode = False
        self.capture_event.clear()
        self.captured_uid = None
        logger.info("Modo captura NFC desactivado")

    def abrir_estacion(self, username: str) -> None:
        self.estacion_abierta = True
        self.estacion_usuario = username
        self.estacion_heartbeat_at = time.time()
        logger.info("Estación de entrada ABIERTA por %s", username)

    def heartbeat_estacion(self) -> bool:
        if not self.estacion_abierta:
            return False
        self.estacion_heartbeat_at = time.time()
        return True

    def cerrar_estacion(self) -> None:
        if self.estacion_abierta:
            logger.info(
                "Estación de entrada CERRADA (era %s)",
                self.estacion_usuario or "desconocido",
            )
        self.estacion_abierta = False
        self.estacion_usuario = None
        self.estacion_heartbeat_at = 0.0

    def registro_permitido(self) -> bool:
        """True solo si hay personal en Escaneo/Kiosco con heartbeat vigente."""
        if not self.estacion_abierta:
            return False
        if (time.time() - self.estacion_heartbeat_at) > ESTACION_TIMEOUT_SECONDS:
            self.cerrar_estacion()
            return False
        return True

    def estado_estacion(self) -> dict[str, Any]:
        abierta = self.registro_permitido()
        return {
            "abierta": abierta,
            "usuario": self.estacion_usuario if abierta else None,
            "timeout_seconds": ESTACION_TIMEOUT_SECONDS,
        }


nfc_manager = NFCConnectionManager()
