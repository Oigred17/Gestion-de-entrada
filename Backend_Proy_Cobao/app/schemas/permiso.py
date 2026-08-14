from datetime import datetime

from pydantic import BaseModel, model_validator

from app.validators import EstatusStr, TextoLibreStr


class PermisoCreate(BaseModel):
    id_alumno: int
    motivo: TextoLibreStr
    fecha_salida: datetime | None = None
    notificar_tutor: bool = False
    id_usuario_registro: int


class PermisoUpdate(BaseModel):
    motivo: TextoLibreStr | None = None
    fecha_salida: datetime | None = None
    estado: EstatusStr | None = None
    codigo_autorizacion: str | None = None
    notificar_tutor: bool | None = None


class CodigoValidacion(BaseModel):
    codigo: str


class PermisoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    id_alumno: int
    motivo: str
    fecha_salida: str | None = None
    fecha_solicitud: str | None = None
    estado: str
    codigo_autorizacion: str | None = None
    notificar_tutor: bool = False
    id_usuario_registro: int
    fecha_registro: str | None = None
    alumno: dict | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_permiso"):
            return {
                "id": data.id_permiso,
                "id_alumno": data.id_alumno,
                "motivo": data.motivo,
                "fecha_salida": str(data.fecha_salida) if getattr(data, "fecha_salida", None) else None,
                "fecha_solicitud": str(data.fecha_solicitud) if getattr(data, "fecha_solicitud", None) else None,
                "estado": getattr(data, "estado", "Pendiente"),
                "codigo_autorizacion": getattr(data, "codigo_autorizacion", None),
                "notificar_tutor": bool(getattr(data, "notificar_tutor", False)),
                "id_usuario_registro": data.id_usuario_registro,
                "fecha_registro": str(data.fecha_registro) if getattr(data, "fecha_registro", None) else None,
                "alumno": getattr(data, "alumno", None),
            }
        return data
