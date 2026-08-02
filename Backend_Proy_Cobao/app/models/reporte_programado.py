from sqlalchemy import Boolean, Column, Date, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class ReporteProgramado(Base):
    __tablename__ = "reportes_programados"

    id_reporte_programado = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    frecuencia = Column(String(20), nullable=False)
    ultima_generacion = Column(Date, nullable=True)
    proxima_generacion = Column(Date, nullable=True)
    destinatarios = Column(String(300), nullable=True)
    activo = Column(Boolean, default=True)
    fecha_registro = Column(Date, nullable=False, server_default=func.now())
