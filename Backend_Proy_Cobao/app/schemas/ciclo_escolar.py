from datetime import date

from pydantic import BaseModel, model_validator

from app.validators import CicloNombreStr, EstatusStr


class CicloEscolarCreate(BaseModel):
    nombre: CicloNombreStr
    fecha_inicio: date
    fecha_fin: date
    activo: bool | None = None
    estatus: EstatusStr | None = None

    @property
    def resolved_activo(self) -> bool:
        if self.activo is not None:
            return self.activo
        if self.estatus is not None:
            return self.estatus.lower() not in ("inactivo", "cerrado")
        return False


class CicloEscolarUpdate(BaseModel):
    nombre: CicloNombreStr | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    activo: bool | None = None
    estatus: EstatusStr | None = None


class CicloEscolarResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nombre: str
    fecha_inicio: date
    fecha_fin: date
    estatus: str
    created_at: str | None = None
    updated_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id"):
            activo = getattr(data, "activo", False)
            return {
                "id": data.id,
                "nombre": data.nombre,
                "fecha_inicio": data.fecha_inicio,
                "fecha_fin": data.fecha_fin,
                "estatus": "Activo" if activo else "Inactivo",
                "created_at": None,
                "updated_at": None,
            }
        return data
