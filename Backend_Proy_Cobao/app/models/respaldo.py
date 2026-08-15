from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Respaldo(Base):
    __tablename__ = "respaldos"

    id_respaldo = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    tamano_bytes = Column(Integer, nullable=False, default=0)
    tipo = Column(String(20), nullable=False, default="Manual")
    estado = Column(String(20), nullable=False, default="Completado")
    contenido = Column(Text, nullable=False)
