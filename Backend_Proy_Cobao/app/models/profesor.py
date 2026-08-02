from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Profesor(Base):
    __tablename__ = "profesores"

    id_profesor = Column(Integer, primary_key=True, index=True)
    num_nomina = Column(Integer, unique=True, nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    telefono = Column(String(20), nullable=True)
    domicilio = Column(Text, nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
