from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Alumno(Base):
    __tablename__ = "alumnos"

    id_alumno = Column(Integer, primary_key=True, index=True)
    matricula = Column(String(20), unique=True, nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    curp = Column(String(18), unique=True, nullable=False)
    nss = Column(String(11), unique=True, nullable=True)
    tipo_sangre = Column(String(3), nullable=True)
    domicilio = Column(Text, nullable=True)
    tutor_nombre = Column(String(150), nullable=True)
    tutor_telefono = Column(String(15), nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_registro = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    grupo_id = Column(Integer, ForeignKey("grupos.id"), nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    genero = Column(String(10), nullable=True)
    capacitacion = Column(String(100), nullable=True)
    cohorte = Column(String(50), nullable=True)
    turno = Column(String(20), nullable=True)
    grupo_nombre = Column(String(50), nullable=True)
