from sqlalchemy import Column, Date, ForeignKey, Integer, Text
from sqlalchemy.sql import func

from app.database import Base


class Justificacion(Base):
    __tablename__ = "justificaciones"

    id_justificacion = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=True)
    id_grupo = Column(Integer, ForeignKey("grupos.id"), nullable=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    motivo = Column(Text, nullable=False)
    id_usuario_registro = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_registro = Column(Date, nullable=False, server_default=func.now())
