from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Permiso(Base):
    __tablename__ = "permisos"

    id_permiso = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=False)
    motivo = Column(Text, nullable=False)
    fecha_salida = Column(DateTime(timezone=True), nullable=True)
    fecha_solicitud = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    estado = Column(String(20), nullable=False, server_default="Pendiente")
    codigo_autorizacion = Column(String(8), nullable=True)
    notificar_tutor = Column(Boolean, nullable=False, default=False)
    id_usuario_registro = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_registro = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
