from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class FaltaAsistencia(Base):
    """Falta de asistencia generada automaticamente.

    tipo: 'FALTANTE' (no registro entrada) o 'SIN_SALIDA' (registro entrada sin salida).
    """

    __tablename__ = "faltas_asistencia"
    __table_args__ = (
        UniqueConstraint("id_alumno", "fecha", "tipo", name="uq_falta_alumno_fecha_tipo"),
    )

    id_falta = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=False)
    fecha = Column(Date, nullable=False)
    tipo = Column(String(20), nullable=False)
    motivo = Column(Text, nullable=True)
    fecha_registro = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
