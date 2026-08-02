from datetime import date

from pydantic import BaseModel, model_validator


class JustificacionCreate(BaseModel):
    id_alumno: int | None = None
    id_grupo: int | None = None
    fecha_inicio: date
    fecha_fin: date
    motivo: str
    id_usuario_registro: int


class JustificacionUpdate(BaseModel):
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    motivo: str | None = None


class JustificacionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    id_alumno: int | None = None
    id_grupo: int | None = None
    fecha_inicio: str
    fecha_fin: str
    motivo: str
    id_usuario_registro: int
    fecha_registro: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_justificacion"):
            return {
                "id": data.id_justificacion,
                "id_alumno": getattr(data, "id_alumno", None),
                "id_grupo": getattr(data, "id_grupo", None),
                "fecha_inicio": str(data.fecha_inicio),
                "fecha_fin": str(data.fecha_fin),
                "motivo": data.motivo,
                "id_usuario_registro": data.id_usuario_registro,
                "fecha_registro": str(data.fecha_registro) if getattr(data, "fecha_registro", None) else None,
            }
        return data
