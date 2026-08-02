from datetime import date

from pydantic import BaseModel, model_validator


class ReporteCreate(BaseModel):
    id_alumno: int
    id_prefecto: int
    motivo: str
    sancion: str
    fecha: date | None = None


class ReporteUpdate(BaseModel):
    motivo: str | None = None
    sancion: str | None = None


class ReporteResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    id_alumno: int
    id_prefecto: int
    motivo: str
    sancion: str
    fecha: str
    fecha_registro: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_reporte"):
            return {
                "id": data.id_reporte,
                "id_alumno": data.id_alumno,
                "id_prefecto": data.id_prefecto,
                "motivo": data.motivo,
                "sancion": data.sancion,
                "fecha": str(data.fecha),
                "fecha_registro": str(data.fecha_registro) if getattr(data, "fecha_registro", None) else None,
            }
        return data
