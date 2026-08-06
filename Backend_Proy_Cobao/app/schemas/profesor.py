from pydantic import BaseModel, model_validator

from app.validators import DireccionStr, EstatusStr, NombreStr, TelefonoStr


class ProfesorCreate(BaseModel):
    num_nomina: int
    nombre_completo: NombreStr
    telefono: TelefonoStr | None = None
    domicilio: DireccionStr | None = None
    estatus: EstatusStr | None = None

    @property
    def resolved_activo(self) -> bool:
        if self.estatus is not None:
            return self.estatus.lower() not in ("inactivo", "baja")
        return True

    @property
    def resolved_numero_empleado(self) -> int:
        return self.num_nomina


class ProfesorUpdate(BaseModel):
    num_nomina: int | None = None
    nombre_completo: NombreStr | None = None
    telefono: TelefonoStr | None = None
    domicilio: DireccionStr | None = None
    estatus: EstatusStr | None = None


class ProfesorResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    num_nomina: int
    nombre_completo: str
    telefono: str | None = None
    domicilio: str | None = None
    activo: bool = True
    fecha_registro: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_profesor"):
            return {
                "id": data.id_profesor,
                "num_nomina": data.num_nomina,
                "nombre_completo": data.nombre_completo,
                "telefono": getattr(data, "telefono", None),
                "domicilio": getattr(data, "domicilio", None),
                "activo": data.activo,
                "fecha_registro": str(data.fecha_registro) if getattr(data, "fecha_registro", None) else None,
            }
        return data
