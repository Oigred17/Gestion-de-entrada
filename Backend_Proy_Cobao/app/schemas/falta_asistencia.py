from datetime import date

from pydantic import BaseModel, model_validator


class FaltaAsistenciaResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    id_alumno: int
    fecha: str
    tipo: str
    motivo: str | None = None
    fecha_registro: str | None = None
    alumno: dict | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_falta"):
            return {
                "id": data.id_falta,
                "id_alumno": data.id_alumno,
                "fecha": str(data.fecha),
                "tipo": data.tipo,
                "motivo": getattr(data, "motivo", None),
                "fecha_registro": str(data.fecha_registro)
                if getattr(data, "fecha_registro", None)
                else None,
                "alumno": getattr(data, "alumno", None),
            }
        return data


class FaltaGenerarResponse(BaseModel):
    fecha: str
    es_dia_habile: bool
    hora_cierre: str | None = None
    faltantes: int = 0
    sin_salida: int = 0
    total: int = 0
    ya_existentes: int = 0
    mensaje: str
