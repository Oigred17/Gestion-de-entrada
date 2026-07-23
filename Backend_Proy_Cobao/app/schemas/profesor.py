from datetime import datetime

from pydantic import BaseModel, model_validator

from app.schemas.alumno import _split_nombre


class ProfesorCreate(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    email: str | None = None
    telefono: str | None = None
    especialidad: str | None = None
    numero_empleado: str | None = None
    domicilio: str | None = None
    estatus: str | None = None

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.apellido_paterno} {self.apellido_materno}".strip()

    @property
    def resolved_numero_empleado(self) -> str:
        return self.numero_empleado or "0"

    @property
    def resolved_activo(self) -> bool:
        if self.estatus is not None:
            return self.estatus.lower() not in ("inactivo", "baja")
        return True


class ProfesorUpdate(BaseModel):
    nombre: str | None = None
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    email: str | None = None
    telefono: str | None = None
    especialidad: str | None = None
    numero_empleado: str | None = None
    domicilio: str | None = None
    estatus: str | None = None


class ProfesorResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    email: str = ""
    telefono: str | None = None
    especialidad: str | None = None
    estatus: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_profesor"):
            parts = _split_nombre(getattr(data, "nombre_completo", "") or "")
            activo = getattr(data, "activo", True)
            return {
                "id": data.id_profesor,
                "nombre": parts["nombre"],
                "apellido_paterno": parts["apellido_paterno"],
                "apellido_materno": parts["apellido_materno"],
                "email": f"{data.numero_empleado}@cobao.edu.mx",
                "telefono": getattr(data, "telefono", None),
                "especialidad": getattr(data, "domicilio", None),
                "estatus": "Activo" if activo else "Inactivo",
                "created_at": getattr(data, "fecha_registro", None),
                "updated_at": None,
            }
        return data
