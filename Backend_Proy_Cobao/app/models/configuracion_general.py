from sqlalchemy import Boolean, Column, Integer, SmallInteger, String, Text, TIMESTAMP
from sqlalchemy.sql import func

from app.database import Base


class ConfiguracionGeneral(Base):
    __tablename__ = "configuracion_general"

    id = Column(SmallInteger, primary_key=True, default=1)
    plantel_nombre = Column(String(150), nullable=False, server_default="COBAO Plantel 27 Miahuatlan")
    telefono = Column(String(15), nullable=False, server_default="")
    direccion = Column(String(255), nullable=False, server_default="")
    correo = Column(String(120), nullable=False, server_default="")
    logo_base64 = Column(Text, nullable=True)
    hora_entrada = Column(String(5), nullable=False, server_default="07:00")
    hora_salida = Column(String(5), nullable=False, server_default="14:00")
    dias_habiles = Column(String(200), nullable=False, server_default="Lunes,Martes,Miercoles,Jueves,Viernes")
    smtp_host = Column(String(120), nullable=False, server_default="")
    smtp_port = Column(Integer, nullable=False, server_default="587")
    smtp_user = Column(String(120), nullable=False, server_default="")
    smtp_password = Column(String(200), nullable=False, server_default="")
    smtp_from = Column(String(120), nullable=False, server_default="")
    sms_proveedor = Column(String(60), nullable=False, server_default="")
    sms_api_key = Column(String(200), nullable=False, server_default="")
    sms_remitente = Column(String(30), nullable=False, server_default="")
    whatsapp_api_key = Column(String(200), nullable=False, server_default="")
    whatsapp_numero = Column(String(30), nullable=False, server_default="")
    notif_email = Column(Boolean, nullable=False, default=True)
    notif_sms = Column(Boolean, nullable=False, default=False)
    notif_whatsapp = Column(Boolean, nullable=False, default=False)
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
