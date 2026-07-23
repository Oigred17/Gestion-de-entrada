from datetime import date, datetime, time

from pydantic import BaseModel, model_validator


class RetardoCreate(BaseModel):
    alumno_id: int | None = None
    id_alumno: int | None = None
    fecha: date
    minutos_retardo: int | None = None
    hora_llegada: str | None = None
    hora_esperada: str | None = None
    observaciones: str | None = None
    estatus: str | None = None

    @property
    def resolved_id_alumno(self) -> int:
        return self.alumno_id or self.id_alumno or 0

    @property
    def resolved_minutos_retardo(self) -> int:
        if self.minutos_retardo is not None:
            return self.minutos_retardo
        if self.hora_llegada:
            try:
                parts = self.hora_llegada.replace(":", " ").split()
                h, m = int(parts[0]), int(parts[1])
                return max(0, (h * 60 + m) - 420)  # 420 = 7:00 AM in minutes
            except (ValueError, IndexError):
                pass
        return 0


class RetardoUpdate(BaseModel):
    minutos_retardo: int | None = None
    hora_llegada: str | None = None
    observaciones: str | None = None
    estatus: str | None = None


class RetardoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    alumno_id: int
    fecha: date
    hora_llegada: str
    hora_esperada: str
    observaciones: str | None = None
    estatus: str
    created_at: str | None = None
    updated_at: str | None = None
    alumno: dict | None = None

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id_retardo"):
            mins = getattr(data, "minutos_retardo", 0)
            total_mins = 7 * 60 + mins  # base 07:00
            hour = total_mins // 60
            minute = total_mins % 60
            return {
                "id": data.id_retardo,
                "alumno_id": data.id_alumno,
                "fecha": data.fecha,
                "hora_llegada": f"{hour:02d}:{minute:02d}",
                "hora_esperada": "07:00",
                "observaciones": getattr(data, "observaciones", None),
                "estatus": "Activo",
                "created_at": None,
                "updated_at": None,
                "alumno": None,
            }
        return data
