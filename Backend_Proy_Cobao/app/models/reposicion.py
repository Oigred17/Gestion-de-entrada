from sqlalchemy import Column, Date, ForeignKey, Integer, Text
from sqlalchemy.sql import func

from app.database import Base


class Reposicion(Base):
    __tablename__ = "reposiciones"

    id_reposicion = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=False)
    id_credencial = Column(Integer, ForeignKey("credenciales.id_credencial"), nullable=True)
    motivo = Column(Text, nullable=False)
    fecha_solicitud = Column(Date, nullable=False)
    fecha_entrega = Column(Date, nullable=True)
    id_usuario_registro = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_registro = Column(Date, nullable=False, server_default=func.now())
