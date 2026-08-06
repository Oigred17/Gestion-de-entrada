from datetime import date

from pydantic import BaseModel, model_validator

from app.validators import DestinatariosStr, NombreStr


class ReporteProgramadoCreate(BaseModel):
    nombre: NombreStr
    frecuencia: NombreStr
    ultima_generacion: date | None = None
    proxima_generacion: date | None = None
    destinatarios: DestinatariosStr | None = None
    activo: bool = True


class ReporteProgramadoUpdate(BaseModel):
    nombre: NombreStr | None = None
    frecuencia: NombreStr | None = None
    ultima_generacion: date | None = None
    proxima_generacion: date | None = None
    destinatarios: DestinatariosStr | None = None
    activo: bool | None = None


class ReporteProgramadoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nombre: str
    frecuencia: str
    ultima_generacion: str | None = None
    proxima_generacion: str | None = None
    destinatarios: str | None = None
    activo: bool
    fecha_registro: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_reporte_programado"):
            return {
                "id": data.id_reporte_programado,
                "nombre": data.nombre,
                "frecuencia": data.frecuencia,
                "ultima_generacion": str(data.ultima_generacion) if getattr(data, "ultima_generacion", None) else None,
                "proxima_generacion": str(data.proxima_generacion) if getattr(data, "proxima_generacion", None) else None,
                "destinatarios": getattr(data, "destinatarios", None),
                "activo": bool(getattr(data, "activo", True)),
                "fecha_registro": str(data.fecha_registro) if getattr(data, "fecha_registro", None) else None,
            }
        return data
