from datetime import datetime

from pydantic import BaseModel, model_validator


def _split_nombre(nombre_completo: str) -> dict:
    parts = (nombre_completo or "").split()
    return {
        "nombre": parts[0] if parts else "",
        "apellido_paterno": parts[1] if len(parts) > 1 else "",
        "apellido_materno": " ".join(parts[2:]) if len(parts) > 2 else "",
    }


class AlumnoCreate(BaseModel):
    matricula: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    email: str | None = None
    telefono: str | None = None
    fecha_nacimiento: str | None = None
    genero: str | None = None
    direccion: str | None = None
    grupo_id: int | None = None
    estatus: str | None = None
    curp: str | None = None
    nss: str | None = None
    tipo_sangre: str | None = None
    tutor_nombre: str | None = None
    tutor_telefono: str | None = None
    capacitacion: str | None = None
    cohorte: str | None = None
    turno: str | None = None
    grupo_nombre: str | None = None

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.apellido_paterno} {self.apellido_materno}".strip()

    @property
    def activo(self) -> bool:
        if self.estatus is not None:
            return self.estatus.lower() not in ("inactivo", "baja")
        return True


class AlumnoUpdate(BaseModel):
    matricula: str | None = None
    nombre: str | None = None
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    email: str | None = None
    telefono: str | None = None
    fecha_nacimiento: str | None = None
    genero: str | None = None
    direccion: str | None = None
    grupo_id: int | None = None
    estatus: str | None = None
    curp: str | None = None
    nss: str | None = None
    tipo_sangre: str | None = None
    tutor_nombre: str | None = None
    tutor_telefono: str | None = None
    capacitacion: str | None = None
    cohorte: str | None = None
    turno: str | None = None
    grupo_nombre: str | None = None


class AlumnoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    matricula: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    email: str
    telefono: str | None = None
    fecha_nacimiento: str | None = None
    genero: str | None = None
    direccion: str | None = None
    grupo_id: int | None = None
    estatus: str
    created_at: str | None = None
    capacitacion: str | None = None
    cohorte: str | None = None
    turno: str | None = None
    grupo_nombre: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_alumno"):
            parts = _split_nombre(getattr(data, "nombre_completo", "") or "")
            activo = getattr(data, "activo", True)
            fn = getattr(data, "fecha_nacimiento", None)
            return {
                "id": data.id_alumno,
                "matricula": data.matricula,
                "nombre": parts["nombre"],
                "apellido_paterno": parts["apellido_paterno"],
                "apellido_materno": parts["apellido_materno"],
                "email": f"{data.matricula}@cobao.edu.mx",
                "telefono": getattr(data, "tutor_telefono", None),
                "fecha_nacimiento": str(fn) if fn else None,
                "genero": getattr(data, "genero", None),
                "direccion": getattr(data, "domicilio", None),
                "grupo_id": getattr(data, "grupo_id", None),
                "estatus": "Activo" if activo else "Inactivo",
                "created_at": str(getattr(data, "fecha_registro", "")) if getattr(data, "fecha_registro", None) else None,
                "capacitacion": getattr(data, "capacitacion", None),
                "cohorte": getattr(data, "cohorte", None),
                "turno": getattr(data, "turno", None),
                "grupo_nombre": getattr(data, "grupo_nombre", None),
            }
        return data
