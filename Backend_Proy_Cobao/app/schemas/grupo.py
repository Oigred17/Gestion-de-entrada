from pydantic import BaseModel, model_validator

from app.validators import EstatusStr, MatriculaStr, TextoLibreStr


class GrupoCreate(BaseModel):
    nombre: MatriculaStr | None = None
    clave_grupo: int | None = None
    descripcion: TextoLibreStr | None = None
    ciclo_escolar_id: int | None = None
    profesor_id: int | None = None
    estatus: EstatusStr | None = None


class GrupoUpdate(BaseModel):
    nombre: MatriculaStr | None = None
    clave_grupo: int | None = None
    descripcion: TextoLibreStr | None = None
    ciclo_escolar_id: int | None = None
    profesor_id: int | None = None
    estatus: EstatusStr | None = None


class GrupoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nombre: str
    clave_grupo: int | None = None
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
            return {
                "id": data.id,
                "nombre": str(clave),
                "clave_grupo": clave,
                "descripcion": "",
                "ciclo_escolar_id": getattr(data, "ciclo_escolar_id", None),
                "profesor_id": None,
                "estatus": "Activo",
                "created_at": None,
                "updated_at": None,
            }
        return data
