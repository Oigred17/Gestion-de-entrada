from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String

from app.database import Base


class Credencial(Base):
    __tablename__ = "credenciales"

    id_credencial = Column(Integer, primary_key=True, index=True)
    uid_nfc = Column(String(100), unique=True, nullable=False)
    fecha_emision = Column(Date, server_default="CURRENT_DATE")
    fecha_vencimiento = Column(Date, nullable=True)
    activa = Column(Boolean, default=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=True)
    id_profesor = Column(Integer, ForeignKey("profesores.id_profesor"), nullable=True)
