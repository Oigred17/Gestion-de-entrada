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
    telefono: str | None = None
    direccion: str | None = None
    estatus: str | None = None
    curp: str | None = None
    nss: str | None = None
    tipo_sangre: str | None = None
    capacitacion: str | None = None
    turno: str | None = None
    cohorte: str | None = None
    fecha_nacimiento: str | None = None
    tutor_nombre: str | None = None
    tutor_telefono: str | None = None
    id_grupo: int | None = None

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
    telefono: str | None = None
    direccion: str | None = None
    estatus: str | None = None
    curp: str | None = None
    nss: str | None = None
    tipo_sangre: str | None = None
    capacitacion: str | None = None
    turno: str | None = None
    cohorte: str | None = None
    fecha_nacimiento: str | None = None
    tutor_nombre: str | None = None
    tutor_telefono: str | None = None
    id_grupo: int | None = None


class AlumnoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    matricula: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    telefono: str | None = None
    direccion: str | None = None
    estatus: str
    created_at: str | None = None
    curp: str | None = None
    nss: str | None = None
    tipo_sangre: str | None = None
    capacitacion: str | None = None
    turno: str | None = None
    cohorte: str | None = None
    fecha_nacimiento: str | None = None
    tutor_nombre: str | None = None
    tutor_telefono: str | None = None
    id_grupo: int | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_alumno"):
            parts = _split_nombre(getattr(data, "nombre_completo", "") or "")
            activo = getattr(data, "activo", True)
            return {
                "id": data.id_alumno,
                "matricula": data.matricula,
                "nombre": parts["nombre"],
                "apellido_paterno": parts["apellido_paterno"],
                "apellido_materno": parts["apellido_materno"],
                "telefono": getattr(data, "tutor_telefono", None),
                "direccion": getattr(data, "domicilio", None),
                "estatus": "Activo" if activo else "Inactivo",
                "created_at": str(getattr(data, "fecha_registro", "")) if getattr(data, "fecha_registro", None) else None,
                "curp": getattr(data, "curp", None),
                "nss": getattr(data, "nss", None),
                "tipo_sangre": getattr(data, "tipo_sangre", None),
                "capacitacion": getattr(data, "capacitacion", None),
                "turno": getattr(data, "turno", None),
                "cohorte": getattr(data, "cohorte", None),
                "fecha_nacimiento": getattr(data, "fecha_nacimiento", None),
                "tutor_nombre": getattr(data, "tutor_nombre", None),
                "tutor_telefono": getattr(data, "tutor_telefono", None),
                "id_grupo": getattr(data, "id_grupo", None),
            }
        return data
