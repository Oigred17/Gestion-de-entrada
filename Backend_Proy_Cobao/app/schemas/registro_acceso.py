from datetime import datetime

from pydantic import BaseModel, model_validator


class RegistroAccesoCreate(BaseModel):
    id_credencial: int | None = None
    credencial_id: int | None = None
    tipo_evento: str | None = None
    tipo_acceso: str | None = None
    alumno_id: int | None = None
    fecha_hora: datetime | None = None
    ubicacion: str | None = None
    estatus: str | None = None

    @property
    def resolved_credencial_id(self) -> int:
        return self.id_credencial or self.credencial_id or 0

    @property
    def resolved_tipo_evento(self) -> str:
        return self.tipo_evento or self.tipo_acceso or "ENTRADA"


class RegistroAccesoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    alumno_id: int | None = None
    credencial_id: int | None = None
    fecha_hora: datetime
    tipo_acceso: str
    ubicacion: str = ""
    estatus: str = "Activo"
    created_at: str | None = None
    updated_at: str | None = None
    alumno: dict | None = None
    credencial: dict | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_registro"):
            tipo = getattr(data, "tipo_evento", "")
            return {
                "id": data.id_registro,
                "alumno_id": None,
                "credencial_id": data.id_credencial,
                "fecha_hora": data.fecha_hora,
                "tipo_acceso": tipo,
                "ubicacion": "",
                "estatus": "Activo",
                "created_at": None,
                "updated_at": None,
                "alumno": None,
                "credencial": None,
            }
        return data
