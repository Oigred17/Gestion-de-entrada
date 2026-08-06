from datetime import date

from pydantic import BaseModel, model_validator

from app.validators import EstatusStr, UidNfcStr


class CredencialCreate(BaseModel):
    numero: UidNfcStr | None = None
    uid_nfc: UidNfcStr | None = None
    alumno_id: int | None = None
    id_alumno: int | None = None
    id_profesor: int | None = None
    tipo: EstatusStr | None = None
    estatus: EstatusStr | None = None
    fecha_emision: date | None = None
    fecha_expiracion: date | None = None
    fecha_vencimiento: date | None = None

    @property
    def resolved_uid_nfc(self) -> str:
        return self.numero or self.uid_nfc or ""

    @property
    def resolved_id_alumno(self) -> int | None:
        return self.alumno_id or self.id_alumno

    @property
    def resolved_activa(self) -> bool:
        if self.estatus is not None:
            return self.estatus.upper() in ("ACTIVA", "ACTIVE", "ACTIVO")
        return True

    @property
    def resolved_fecha_vencimiento(self) -> date | None:
        return self.fecha_vencimiento or self.fecha_expiracion


class CredencialUpdate(BaseModel):
    uid_nfc: UidNfcStr | None = None
    numero: UidNfcStr | None = None
    activa: bool | None = None
    estatus: EstatusStr | None = None
    id_alumno: int | None = None
    alumno_id: int | None = None
    fecha_vencimiento: date | None = None
    fecha_expiracion: date | None = None


class CredencialResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    alumno_id: int | None = None
    numero: str | None = None
    tipo: str | None = None
    estatus: str
    fecha_emision: date | None = None
    fecha_expiracion: date | None = None
    created_at: str | None = None
    updated_at: str | None = None
    alumno: dict | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_credencial"):
            activa = getattr(data, "activa", True)
            id_alumno = getattr(data, "id_alumno", None)
            tipo = "Alumno" if id_alumno else "Profesor"
            return {
                "id": data.id_credencial,
                "alumno_id": id_alumno,
                "numero": data.uid_nfc,
                "tipo": tipo,
                "estatus": "ACTIVA" if activa else "INACTIVA",
                "fecha_emision": getattr(data, "fecha_emision", None),
                "fecha_expiracion": getattr(data, "fecha_vencimiento", None),
                "created_at": None,
                "updated_at": None,
                "alumno": None,
            }
        return data
