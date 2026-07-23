from pydantic import BaseModel, model_validator


class GrupoCreate(BaseModel):
    nombre: str | None = None
    clave_grupo: int | None = None
    descripcion: str | None = None
    ciclo_escolar_id: int | None = None
    profesor_id: int | None = None
    estatus: str | None = None


class GrupoUpdate(BaseModel):
    nombre: str | None = None
    clave_grupo: int | None = None
    descripcion: str | None = None
    ciclo_escolar_id: int | None = None
    profesor_id: int | None = None
    estatus: str | None = None


class GrupoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nombre: str
    descripcion: str = ""
    ciclo_escolar_id: int | None = None
    profesor_id: int | None = None
    estatus: str = "Activo"
    created_at: str | None = None
    updated_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "clave_grupo"):
            clave = getattr(data, "clave_grupo", 0)
            semestre = clave // 100 if clave else 0
            nombre = f"{semestre}ro - {clave}"
            return {
                "id": data.id,
                "nombre": nombre,
                "descripcion": "",
                "ciclo_escolar_id": getattr(data, "ciclo_escolar_id", None),
                "profesor_id": None,
                "estatus": "Activo",
                "created_at": None,
                "updated_at": None,
            }
        return data
