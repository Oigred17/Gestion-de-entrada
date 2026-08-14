"""Helpers compartidos para armar respuestas con datos anidados."""


def _split_nombre(nombre_completo: str) -> dict:
    parts = (nombre_completo or "").split()
    return {
        "nombre": parts[0] if parts else "",
        "apellido_paterno": parts[1] if len(parts) > 1 else "",
        "apellido_materno": " ".join(parts[2:]) if len(parts) > 2 else "",
    }


def build_alumno_dict(alumno, grupo_nombre: str | None = None) -> dict:
    """Convierte un Alumno (y su grupo) en el dict que consumen las respuestas."""
    parts = _split_nombre(getattr(alumno, "nombre_completo", "") or "")
    return {
        "id": alumno.id_alumno,
        "matricula": alumno.matricula,
        "nombre": parts["nombre"],
        "apellido_paterno": parts["apellido_paterno"],
        "apellido_materno": parts["apellido_materno"],
        "tutor_nombre": getattr(alumno, "tutor_nombre", None),
        "tutor_telefono": getattr(alumno, "tutor_telefono", None),
        "grupo": str(grupo_nombre) if grupo_nombre is not None else None,
    }
