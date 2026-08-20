from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(150), nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    password_user = Column(String(255), nullable=False)
    email = Column(String(120), nullable=True)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    mfa_enabled = Column(Boolean, nullable=False, default=False)
    mfa_secret = Column(String(32), nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
