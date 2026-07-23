import asyncio
import json
import logging
from datetime import datetime
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class NFCConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()
        self.capture_mode = False
        self.capture_event = asyncio.Event()
        self.captured_uid: str | None = None

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


nfc_manager = NFCConnectionManager()
