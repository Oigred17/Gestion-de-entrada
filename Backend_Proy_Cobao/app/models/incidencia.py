from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Incidencia(Base):
    __tablename__ = "incidencias"

    id_incidencia = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=False)
    tipo = Column(String(30), nullable=False)
    descripcion = Column(Text, nullable=False)
    estado = Column(String(20), nullable=False, server_default="Abierto")
    notificar = Column(Boolean, nullable=False, default=False)
    evidencia_base64 = Column(Text, nullable=True)
    id_usuario_registro = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_registro = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    fecha_resolucion = Column(DateTime(timezone=True), nullable=True)
