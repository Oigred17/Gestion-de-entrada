from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, Text, text
from sqlalchemy.sql import func

from app.database import Base


class Reporte(Base):
    __tablename__ = "reportes"

    id_reporte = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=False)
    id_prefecto = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    motivo = Column(Text, nullable=False)
    sancion = Column(Text, nullable=False)
    sancion_cumplida = Column(Boolean, nullable=False, server_default=text("false"))
    fecha = Column(Date, nullable=False, server_default=func.current_date())
    fecha_registro = Column(Date, nullable=False, server_default=func.now())
