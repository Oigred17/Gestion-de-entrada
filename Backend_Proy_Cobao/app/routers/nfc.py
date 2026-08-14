import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import credencial as crud_credencial
from app.crud import registro_acceso as crud_registro
from app.database import async_session
from app.models.registro_acceso import RegistroAcceso
from app.nfc_manager import nfc_manager
from app.schemas.registro_acceso import RegistroAccesoCreate
from app.validators import UidNfcStr

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nfc", tags=["NFC"])


class NFCScanRequest(BaseModel):
    uid_nfc: UidNfcStr
    tipo: str = "auto"


class NFCWriteRequest(BaseModel):
    uid_nfc: UidNfcStr
    credencial_id: int


async def _process_card_read(uid_nfc: str, db=None):
    close_db = False
    if db is None:
        db = async_session()
        close_db = True

    try:
        nfc_manager.note_uid(uid_nfc)

        if nfc_manager.capture_mode:
            nfc_manager.capture_event.set()
            nfc_manager.captured_uid = uid_nfc
            await nfc_manager.broadcast({
                "type": "card_captured",
                "uid_nfc": uid_nfc,
                "timestamp": datetime.now().isoformat(),
            })
            return

        credencial = await crud_credencial.get_credencial_by_uid(db, uid_nfc)
        if not credencial:
            await nfc_manager.broadcast({
                "type": "scan_result",
                "status": "denied",
                "uid_nfc": uid_nfc,
                "message": "Credencial no reconocida",
                "timestamp": datetime.now().isoformat(),
            })
            return

        if not credencial.activa:
            await nfc_manager.broadcast({
                "type": "scan_result",
                "status": "denied",
                "uid_nfc": uid_nfc,
                "message": "Credencial desactivada",
                "credencial_id": credencial.id_credencial,
                "timestamp": datetime.now().isoformat(),
            })
            return

        now = datetime.now()
        tipo_evento = "ENTRADA"

        count_stmt = select(func.count()).where(
            and_(
                RegistroAcceso.id_credencial == credencial.id_credencial,
                func.date(RegistroAcceso.fecha_hora) == now.date()
            )
        )
        result = await db.execute(count_stmt)
        today_count = result.scalar() or 0

        if today_count % 2 == 1:
            tipo_evento = "SALIDA"

        registro = await crud_registro.create_registro(
            db,
            RegistroAccesoCreate(
                id_credencial=credencial.id_credencial,
                tipo_evento=tipo_evento,
            ),
        )
        await db.commit()

        alumno_data = None
        if credencial.id_alumno:
            from app.crud import alumno as crud_alumno
            alumno = await crud_alumno.get_alumno(db, credencial.id_alumno)
            if alumno:
                parts = (alumno.nombre_completo or "").split()
                alumno_data = {
                    "id": alumno.id_alumno,
                    "nombre": alumno.nombre_completo,
                    "matricula": alumno.matricula,
                }

        await nfc_manager.broadcast({
            "type": "scan_result",
            "status": "success",
            "tipo_evento": tipo_evento,
            "uid_nfc": uid_nfc,
            "credencial_id": credencial.id_credencial,
            "registro_id": registro.id_registro,
            "alumno": alumno_data,
            "timestamp": now.isoformat(),
        })

    except Exception as e:
        logger.error(f"Error procesando tarjeta NFC: {e}")
        await nfc_manager.broadcast({
            "type": "scan_result",
            "status": "error",
            "uid_nfc": uid_nfc,
            "message": str(e),
            "timestamp": datetime.now().isoformat(),
        })
    finally:
        if close_db:
            await db.close()


@router.websocket("/ws")
async def websocket_nfc(websocket: WebSocket):
    await nfc_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await nfc_manager.disconnect(websocket)
    except Exception:
        await nfc_manager.disconnect(websocket)


@router.post("/scan")
async def receive_scan(data: NFCScanRequest):
    async with async_session() as db:
        await _process_card_read(data.uid_nfc, db)
    return {"status": "processed", "uid_nfc": data.uid_nfc}


@router.post("/write")
async def write_card(data: NFCWriteRequest):
    async with async_session() as db:
        credencial = await crud_credencial.get_credencial(db, data.credencial_id)
        if not credencial:
            return {"status": "error", "message": "Credencial no encontrada"}

        otro = await crud_credencial.get_credencial_by_uid_excluding(
            db, data.uid_nfc, data.credencial_id
        )
        if otro:
            return {
                "status": "error",
                "message": "Este chip NFC ya esta asignado a otra credencial. Usa un chip diferente.",
            }

        if credencial.id_alumno is not None:
            activa_existente = (
                await crud_credencial.get_credencial_activa_by_alumno(
                    db, credencial.id_alumno
                )
            )
            if activa_existente and activa_existente.id_credencial != data.credencial_id:
                return {
                    "status": "error",
                    "message": (
                        "El alumno ya tiene una credencial activa (UID: "
                        f"{activa_existente.uid_nfc}). Para escribir los datos en "
                        "un nuevo chip primero da de baja o elimina la credencial anterior."
                    ),
                }

        credencial.uid_nfc = data.uid_nfc
        await db.commit()

        await nfc_manager.broadcast({
            "type": "card_written",
            "credencial_id": data.credencial_id,
            "uid_nfc": data.uid_nfc,
            "timestamp": datetime.now().isoformat(),
        })

    return {"status": "ok", "credencial_id": data.credencial_id, "uid_nfc": data.uid_nfc}


@router.post("/capture/start")
async def start_capture():
    nfc_manager.start_capture()
    return {"status": "ok", "message": "Modo captura activado. Acerca una tarjeta NFC al lector."}


@router.post("/capture/stop")
async def stop_capture():
    nfc_manager.stop_capture()
    return {"status": "ok", "message": "Modo captura desactivado."}


@router.get("/capture/poll")
async def poll_capture():
    if nfc_manager.captured_uid:
        uid = nfc_manager.captured_uid
        nfc_manager.captured_uid = None
        nfc_manager.stop_capture()
        return {"status": "captured", "uid_nfc": uid, "timestamp": datetime.now().isoformat()}
    if nfc_manager.capture_mode:
        return {"status": "waiting"}
    return {"status": "idle"}
