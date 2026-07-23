from datetime import datetime

from pydantic import BaseModel, model_validator

from app.schemas.alumno import _split_nombre


class UsuarioCreate(BaseModel):
    username: str
    password_user: str
    nombre: str = ""
    apellido_paterno: str = ""
    apellido_materno: str = ""
    nombre_completo: str | None = None
    email: str | None = None
    rol_id: int | None = None
    id_rol: int | None = None
    estatus: str | None = None
    activo: bool = True

    @property
    def resolved_id_rol(self) -> int:
        return self.rol_id or self.id_rol or 1

    @property
    def resolved_nombre_completo(self) -> str:
        if self.nombre_completo:
            return self.nombre_completo
        return f"{self.nombre} {self.apellido_paterno} {self.apellido_materno}".strip()

    @property
    def resolved_activo(self) -> bool:
        if self.estatus is not None:
            return self.estatus.lower() not in ("inactivo", "baja")
        return self.activo


class UsuarioUpdate(BaseModel):
    username: str | None = None
    password_user: str | None = None
    nombre: str | None = None
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    nombre_completo: str | None = None
    email: str | None = None
    rol_id: int | None = None
    id_rol: int | None = None
    estatus: str | None = None
    activo: bool | None = None


class UsuarioResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    username: str
    email: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    rol_id: int
    estatus: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_usuario"):
            parts = _split_nombre(getattr(data, "nombre_completo", "") or "")
            activo = getattr(data, "activo", True)
            return {
                "id": data.id_usuario,
                "username": data.username,
                "email": f"{data.username}@cobao.edu.mx",
                "nombre": parts["nombre"],
                "apellido_paterno": parts["apellido_paterno"],
                "apellido_materno": parts["apellido_materno"],
                "rol_id": data.id_rol,
                "estatus": "Activo" if activo else "Inactivo",
                "created_at": data.fecha_creacion,
                "updated_at": None,
            }
        return data
