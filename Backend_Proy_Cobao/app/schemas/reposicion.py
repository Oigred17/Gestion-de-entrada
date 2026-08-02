from datetime import date

from pydantic import BaseModel, model_validator


class ReposicionCreate(BaseModel):
    id_alumno: int
    id_credencial: int | None = None
    motivo: str
    fecha_solicitud: date | None = None
    fecha_entrega: date | None = None
    id_usuario_registro: int | None = None


class ReposicionUpdate(BaseModel):
    id_credencial: int | None = None
    motivo: str | None = None
    fecha_solicitud: date | None = None
    fecha_entrega: date | None = None


class ReposicionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    id_alumno: int
    id_credencial: int | None = None
    motivo: str
    fecha_solicitud: str
    fecha_entrega: str | None = None
    id_usuario_registro: int | None = None
    fecha_registro: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_reposicion"):
            return {
                "id": data.id_reposicion,
                "id_alumno": data.id_alumno,
                "id_credencial": getattr(data, "id_credencial", None),
                "motivo": data.motivo,
                "fecha_solicitud": str(data.fecha_solicitud),
                "fecha_entrega": str(data.fecha_entrega) if getattr(data, "fecha_entrega", None) else None,
                "id_usuario_registro": getattr(data, "id_usuario_registro", None),
                "fecha_registro": str(data.fecha_registro) if getattr(data, "fecha_registro", None) else None,
            }
        return data
