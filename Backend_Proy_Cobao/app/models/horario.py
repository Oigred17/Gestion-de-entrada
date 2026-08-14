from sqlalchemy import Boolean, Column, Integer, String

from app.database import Base


class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(120), nullable=False)
    hora_entrada = Column(String(5), nullable=False)
    hora_salida = Column(String(5), nullable=False)
    dias = Column(String(200), nullable=False, server_default="")
    activo = Column(Boolean, nullable=False, default=True)
