from sqlalchemy import Column, Integer, String

from app.database import Base


class Rol(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(30), unique=True, nullable=False)
