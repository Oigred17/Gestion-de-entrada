from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class RegistroAcceso(Base):
    __tablename__ = "registros_acceso"

    id_registro = Column(Integer, primary_key=True, index=True)
    id_credencial = Column(Integer, ForeignKey("credenciales.id_credencial"), nullable=False)
    fecha_hora = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    tipo_evento = Column(String(10), nullable=False)  # 'ENTRADA' o 'SALIDA'
    id_permiso = Column(Integer, ForeignKey("permisos.id_permiso"), nullable=True)
