from pydantic import BaseModel, model_validator

from app.validators import EstatusStr, MatriculaStr, TextoLibreStr

import re


def _parse_anio_periodo(ciclo_nombre: str | None, semestre: int | None):
    if not ciclo_nombre or not semestre:
        return None, None
    m = re.search(r"(\d{4})", ciclo_nombre)
    if not m:
        return None, None
    anio_base = int(m.group(1))
    periodo = "B" if semestre % 2 == 1 else "A"
    anio = anio_base if periodo == "B" else anio_base + 1
    return periodo, anio


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
    semestre: int | None = None
    periodo: str | None = None
    anio: int | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "clave_grupo"):
            clave = getattr(data, "clave_grupo", 0)
            semestre = clave // 100 if clave else None
            ciclo_nombre = getattr(data, "_ciclo_nombre", None)
            periodo, anio = _parse_anio_periodo(ciclo_nombre, semestre)
            return {
                "id": data.id,
                "nombre": str(clave),
                "clave_grupo": clave,
                "descripcion": "",
                "ciclo_escolar_id": getattr(data, "ciclo_escolar_id", None),
                "profesor_id": None,
                "estatus": "Activo",
                "semestre": semestre,
                "periodo": periodo,
                "anio": anio,
                "created_at": None,
                "updated_at": None,
            }
        return data
