from pydantic import BaseModel, model_validator

from app.validators import HoraStr, NombreStr, TelefonoStr


class HorarioCreate(BaseModel):
    descripcion: NombreStr
    hora_entrada: HoraStr
    hora_salida: HoraStr
    dias: str | None = None
    activo: bool = True


class HorarioUpdate(BaseModel):
    descripcion: NombreStr | None = None
    hora_entrada: HoraStr | None = None
    hora_salida: HoraStr | None = None
    dias: str | None = None
    activo: bool | None = None


class HorarioResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    descripcion: str
    hora_entrada: str
    hora_salida: str
    dias: str = ""
    activo: bool = True

    @model_validator(mode="before")
    @classmethod
    def _from_db(cls, data):
        if hasattr(data, "id"):
            return {
                "id": data.id,
                "descripcion": data.descripcion,
                "hora_entrada": data.hora_entrada,
                "hora_salida": data.hora_salida,
                "dias": getattr(data, "dias", "") or "",
                "activo": bool(getattr(data, "activo", True)),
            }
        return data


class ConfiguracionGeneralUpdate(BaseModel):
    plantel_nombre: NombreStr | None = None
    telefono: TelefonoStr | None = None
    direccion: str | None = None
    correo: str | None = None
    logo_base64: str | None = None
    hora_entrada: HoraStr | None = None
    hora_salida: HoraStr | None = None
    dias_habiles: str | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    sms_proveedor: str | None = None
    sms_api_key: str | None = None
    sms_remitente: str | None = None
    whatsapp_api_key: str | None = None
    whatsapp_numero: str | None = None
    notif_email: bool | None = None
    notif_sms: bool | None = None
    notif_whatsapp: bool | None = None
    # Asistencia
    hora_entrada_limite: HoraStr | None = None
    minutos_tolerancia: int | None = None
    segundos_antirebote: int | None = None


class ConfiguracionResponse(BaseModel):
    plantel: dict
    horarios: list[dict]
    asistencia: dict
