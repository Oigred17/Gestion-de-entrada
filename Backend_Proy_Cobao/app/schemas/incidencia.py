from datetime import datetime

from pydantic import BaseModel, model_validator

from app.validators import EstatusStr, TextoLibreStr


class IncidenciaCreate(BaseModel):
    id_alumno: int
    tipo: EstatusStr
    descripcion: TextoLibreStr
    notificar: bool = False
    evidencia_base64: str | None = None
    id_usuario_registro: int


class IncidenciaUpdate(BaseModel):
    tipo: EstatusStr | None = None
    descripcion: TextoLibreStr | None = None
    estado: EstatusStr | None = None
    notificar: bool | None = None
    evidencia_base64: str | None = None


class IncidenciaResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    id_alumno: int
    tipo: str
    descripcion: str
    estado: str
    notificar: bool = False
    evidencia_base64: str | None = None
    id_usuario_registro: int
    fecha_registro: str | None = None
    fecha_resolucion: str | None = None
    alumno: dict | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_incidencia"):
            return {
                "id": data.id_incidencia,
                "id_alumno": data.id_alumno,
                "tipo": data.tipo,
                "descripcion": data.descripcion,
                "estado": getattr(data, "estado", "Abierto"),
                "notificar": bool(getattr(data, "notificar", False)),
                "evidencia_base64": getattr(data, "evidencia_base64", None),
                "id_usuario_registro": data.id_usuario_registro,
                "fecha_registro": str(data.fecha_registro) if getattr(data, "fecha_registro", None) else None,
                "fecha_resolucion": str(data.fecha_resolucion) if getattr(data, "fecha_resolucion", None) else None,
                "alumno": getattr(data, "alumno", None),
            }
        return data
