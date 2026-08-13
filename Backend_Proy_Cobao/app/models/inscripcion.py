from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class Inscripcion(Base):
    __tablename__ = "inscripciones"
    __table_args__ = (
        UniqueConstraint("id_alumno", "ciclo_escolar_id", name="uq_alumno_ciclo"),
    )

    id_inscripcion = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=False)
    id_grupo = Column(Integer, ForeignKey("grupos.id"), nullable=False)
    ciclo_escolar_id = Column(Integer, ForeignKey("ciclos_escolares.id"), nullable=False)
    fecha_inscripcion = Column(Date, nullable=False, server_default=func.current_date())
    activo = Column(Boolean, nullable=False, default=True)
