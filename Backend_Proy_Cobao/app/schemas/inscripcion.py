from datetime import date

from pydantic import BaseModel, model_validator


class InscripcionCreate(BaseModel):
    alumno_id: int | None = None
    id_alumno: int | None = None
    grupo_id: int | None = None
    id_grupo: int | None = None
    ciclo_escolar_id: int
    fecha_inscripcion: str | None = None
    estatus: str | None = None

    @property
    def resolved_alumno_id(self) -> int:
        return self.alumno_id or self.id_alumno or 0

    @property
    def resolved_grupo_id(self) -> int:
        return self.grupo_id or self.id_grupo or 0


class InscripcionUpdate(BaseModel):
    grupo_id: int | None = None
    id_grupo: int | None = None
    ciclo_escolar_id: int | None = None
    estatus: str | None = None


class InscripcionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    alumno_id: int
    grupo_id: int | None = None
    ciclo_escolar_id: int
    fecha_inscripcion: date | None = None
    estatus: str = "Activo"
    created_at: str | None = None
    updated_at: str | None = None
    alumno: dict | None = None
    ciclo_escolar: dict | None = None
    grupo: dict | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id"):
            return {
                "id": data.id,
                "alumno_id": data.id_alumno,
                "grupo_id": getattr(data, "id_grupo", None),
                "ciclo_escolar_id": data.ciclo_escolar_id,
                "fecha_inscripcion": data.fecha_inscripcion,
                "estatus": "Activo",
                "created_at": None,
                "updated_at": None,
                "alumno": None,
                "ciclo_escolar": None,
                "grupo": None,
            }
        return data
