from pydantic import BaseModel, model_validator


class RolCreate(BaseModel):
    nombre: str
    descripcion: str | None = None


class RolUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None


class RolResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nombre: str
    descripcion: str = ""
    estatus: str = "Activo"
    created_at: str | None = None
    updated_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_rol"):
            return {
                "id": data.id_rol,
                "nombre": data.nombre,
                "descripcion": getattr(data, "descripcion", "") or "",
                "estatus": "Activo",
                "created_at": None,
                "updated_at": None,
            }
        return data
